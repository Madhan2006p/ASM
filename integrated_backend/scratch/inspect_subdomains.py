import os
import sys
import django

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from attacksurface.models import SubdomainResult

# Check the model fields
print("Fields in SubdomainResult:")
for field in SubdomainResult._meta.fields:
    print(f"- {field.name}: {field.get_internal_type()}")

# Check first object
first_sub = SubdomainResult.objects.first()
if first_sub:
    print("\nFirst subdomain record data:")
    for field in SubdomainResult._meta.fields:
        print(f"  {field.name}: {getattr(first_sub, field.name)}")
else:
    print("\nNo subdomains in DB.")
