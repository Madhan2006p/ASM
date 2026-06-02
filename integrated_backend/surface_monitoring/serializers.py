from rest_framework import serializers

from .models import GitHubRepository, RepoEvent, RepoScan, SurfaceMonitorConfig


class SurfaceMonitorConfigSerializer(serializers.ModelSerializer):
    repo_count = serializers.SerializerMethodField()

    class Meta:
        model = SurfaceMonitorConfig
        fields = [
            'id', 'keyword', 'is_active', 'interval_minutes',
            'org_id', 'created_at', 'updated_at', 'repo_count',
        ]
        read_only_fields = ('org_id', 'created_at', 'updated_at')

    def get_repo_count(self, obj):
        return GitHubRepository.objects.filter(config=obj).count()


class GitHubRepositorySerializer(serializers.ModelSerializer):
    latest_scan = serializers.SerializerMethodField()
    scan_count = serializers.SerializerMethodField()

    class Meta:
        model = GitHubRepository
        fields = [
            'id', 'config', 'name', 'full_name', 'repo_url', 'owner',
            'owner_url', 'description', 'visibility', 'language',
            'default_branch', 'stars', 'forks', 'open_issues',
            'last_github_updated', 'clone_url', 'status',
            'hardcoded_credentials_count', 'scanned_files_count',
            'last_scanned_at', 'org_id', 'discovered_at', 'updated_at',
            'latest_scan', 'scan_count',
        ]
        read_only_fields = (
            'org_id', 'discovered_at', 'updated_at', 'status',
            'hardcoded_credentials_count', 'scanned_files_count',
            'last_scanned_at',
        )

    def get_latest_scan(self, obj):
        scan = RepoScan.objects.filter(repository=obj).order_by('-created_at').first()
        if scan:
            return {
                'id': scan.id,
                'status': scan.status,
                'secrets_count': scan.hardcoded_credentials_count,
                'files_count': scan.scanned_files_count,
                'started_at': scan.started_at,
                'completed_at': scan.completed_at,
            }
        return None

    def get_scan_count(self, obj):
        return RepoScan.objects.filter(repository=obj).count()


class RepoScanSerializer(serializers.ModelSerializer):
    repo_name = serializers.CharField(source='repository.full_name', read_only=True)

    class Meta:
        model = RepoScan
        fields = [
            'id', 'repository', 'repo_name', 'status',
            'secrets_found', 'secrets_summary', 'scanned_files_count',
            'hardcoded_credentials_count', 'raw_output', 'error_message',
            'started_at', 'completed_at', 'org_id', 'created_at',
        ]
        read_only_fields = (
            'org_id', 'created_at', 'started_at', 'completed_at',
            'status', 'secrets_found', 'secrets_summary',
            'scanned_files_count', 'hardcoded_credentials_count',
            'raw_output', 'error_message',
        )


class RepoEventSerializer(serializers.ModelSerializer):
    repo_name = serializers.CharField(source='repository.full_name', read_only=True)
    repo_url = serializers.URLField(source='repository.repo_url', read_only=True)

    class Meta:
        model = RepoEvent
        fields = [
            'id', 'repository', 'repo_name', 'repo_url',
            'event_type', 'github_event_id', 'actor', 'ref',
            'commit_message', 'commit_count',
            'action_name', 'action_run_url', 'action_conclusion',
            'event_occurred_at', 'created_at', 'org_id',
        ]
        read_only_fields = '__all__'


class SurfaceMonitorDashboardSerializer(serializers.Serializer):
    total_repos = serializers.IntegerField()
    total_scans = serializers.IntegerField()
    total_secrets_found = serializers.IntegerField()
    active_keywords = serializers.IntegerField()
    recent_events = serializers.IntegerField()
    recent_pushes = serializers.IntegerField()
    recent_creates = serializers.IntegerField()
    recent_updates = serializers.IntegerField()
    recent_action_success = serializers.IntegerField()
    recent_action_failed = serializers.IntegerField()
    latest_events = serializers.ListField(child=RepoEventSerializer(), required=False)
    repos_by_visibility = serializers.DictField(child=serializers.IntegerField())
    repos_by_language = serializers.DictField(child=serializers.IntegerField())
