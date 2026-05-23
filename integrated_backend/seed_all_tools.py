import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from targets.models import Target, Endpoint
from scans.models import Scan
from fuzzing.models import FuzzingQueue, FuzzingResult
from vulnerabilities.models import Vulnerability
from django.utils import timezone

def seed_all():
    print("Starting comprehensive seeder...")

    # 1. Get or create superuser
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        username = os.getenv('ADMIN_USERNAME', 'admin')
        email = os.getenv('ADMIN_EMAIL', 'admin@localhost')
        password = os.getenv('ADMIN_PASSWORD', 'changeme')
        user = User.objects.create_superuser(username, email, password)

    # 2. Get or create Target
    target, _ = Target.objects.get_or_create(
        domain='example.com',
        user=user,
        defaults={'description': 'Full Reconnaissance Scope Target'}
    )

    # 3. Create all 11 scans to show ALL tools executed
    tools_list = [
        ('DIRSEARCH', 'Dirsearch'),
        ('HTTPX_TECH', 'Httpx Technology Detect'),
        ('INQL', 'InQL GraphQL Introspection'),
        ('GAU', 'GAU Endpoint Fetcher'),
        ('WAYBACKURLS', 'Waybackurls Crawler'),
        ('SWAGGER', 'Swagger Spec Extractor'),
        ('SOAP_WSDL', 'SOAP WSDL Operations Extractor'),
        ('GRPCURL', 'gRPCurl Services Lister'),
        ('ARJUN', 'Arjun Parameter Discovery'),
        ('NUCLEI', 'Nuclei Vulnerability Scan'),
        ('NMAP', 'Nmap Network Scan'),
    ]

    for scan_type, _ in tools_list:
        scan, created = Scan.objects.get_or_create(
            target=target,
            scan_type=scan_type,
            defaults={
                'status': 'COMPLETED',
                'started_at': timezone.now(),
                'completed_at': timezone.now(),
                'result_file': f'/mock_outputs/{scan_type.lower()}_run.json'
            }
        )
        if created:
            print(f"Registered tool execution log for: {scan_type}")
        else:
            scan.status = 'COMPLETED'
            scan.save()

    # 4. Create distinct endpoints per tool logic
    endpoints_data = [
        # Dirsearch discovery
        ('/admin/login.php', 'GET', 200, 'REST'),
        ('/backup.zip', 'GET', 403, 'REST'),
        # GraphQL discovery
        ('/graphql', 'POST', 200, 'GraphQL'),
        ('/v1/graphql', 'POST', 200, 'GraphQL'),
        # REST / GAU discovery
        ('/api/v2/users', 'GET', 200, 'REST'),
        ('/api/v2/payments', 'POST', 401, 'REST'),
        # Swagger discovery
        ('/swagger.json', 'GET', 200, 'Swagger/OpenAPI'),
        ('/api-docs/swagger.yaml', 'GET', 200, 'Swagger/OpenAPI'),
        # SOAP WSDL discovery
        ('/ws/services?wsdl', 'GET', 200, 'SOAP'),
        # gRPC detection
        ('/grpc.health.v1.Health/Check', 'POST', 200, 'gRPC'),
    ]

    for path, method, status_code, tech in endpoints_data:
        url = f"https://{target.domain}{path}"
        ep, created = Endpoint.objects.get_or_create(
            target=target,
            url=url,
            method=method,
            defaults={
                'status_code': status_code,
                'technology': tech
            }
        )
        if created:
            print(f"Discovered via scan: {method} {url} ({tech})")

    # 5. Populate Arjun param discovery outcomes on these endpoints
    all_endpoints = Endpoint.objects.filter(target=target)
    for ep in all_endpoints:
        # Fuzzing queue status
        FuzzingQueue.objects.get_or_create(
            endpoint=ep,
            defaults={
                'status': 'COMPLETED',
                'started_at': timezone.now(),
                'completed_at': timezone.now(),
            }
        )
        
        # Discovered params depending on the path
        if 'users' in ep.url:
            params = ['id', 'role', 'sort', 'page']
        elif 'payments' in ep.url:
            params = ['amount', 'currency', 'token']
        elif 'graphql' in ep.url:
            params = ['query', 'variables']
        elif 'services?wsdl' in ep.url:
            params = ['service', 'port']
        else:
            params = ['debug', 'v']

        for param in params:
            FuzzingResult.objects.get_or_create(
                endpoint=ep,
                parameter=param,
                method=ep.method,
                defaults={'is_vulnerable': param in ['id', 'query', 'debug']}
            )

    # 6. Seed full tools vulnerabilities discovered
    vulnerabilities = [
        ('GraphQL Introspection Enabled', 'MEDIUM', 'Introspection queries are fully allowed. This exposes complete schema details.', 'Disable schema introspection in your graphql engine config.', 'InQL / Nuclei'),
        ('Exposed Private Backup File', 'HIGH', 'Backup archive `/backup.zip` is protected only by weak forbidden code.', 'Remove all static zip files from server root.', 'Dirsearch'),
        ('Exposed Swagger API Spec Details', 'LOW', 'Full api details are readable publicly at /swagger.json.', 'Restrict swagger endpoints to admin user IPs.', 'Swagger Spec Extractor'),
        ('WSDL SOAP Operations Exposed', 'LOW', 'Complete SOAP operational methods list retrieved from /ws/services?wsdl.', 'Disable anonymous access to WSDL definitions.', 'SOAP WSDL Operations Extractor'),
        ('gRPC Service Reflection Enabled', 'MEDIUM', 'Server allows clients to query all registered gRPC services using gRPCurl.', 'Disable reflection API in production gRPC servers.', 'gRPCurl Services Lister'),
    ]

    for title, severity, desc, rem, tool in vulnerabilities:
        Vulnerability.objects.get_or_create(
            target=target,
            title=title,
            defaults={
                'severity': severity,
                'description': desc,
                'remediation': rem,
                'source_tool': tool,
                'is_resolved': False
            }
        )
        print(f"Vulnerability logged: {title} via {tool}")

    print("All 11 API Recon & Discovery tools successfully seeded!")

if __name__ == '__main__':
    seed_all()
