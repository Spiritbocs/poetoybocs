#!/usr/bin/env python3
"""
GitHub Issues Sync from KANBAN.md

This script parses our KANBAN.md file and creates corresponding GitHub issues
to keep our project board in sync with our markdown documentation.

Usage:
    python sync-kanban.py

Requirements:
    pip install PyGithub
    
Environment Variables:
    GITHUB_TOKEN - Personal access token for GitHub API
    GITHUB_REPO - Repository in format "owner/repo"
"""

import os
import re
import sys
from typing import List, Dict, Optional

try:
    from github import Github
except ImportError:
    print("Error: PyGithub not installed. Run: pip install PyGithub")
    sys.exit(1)

def parse_kanban_md(file_path: str) -> List[Dict]:
    """Parse KANBAN.md and extract issues"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match numbered issues
    issue_pattern = r'(\d+)\.\s\*\*\[(\w+)\]\s([^*]+)\*\*'
    issues = []
    
    for match in re.finditer(issue_pattern, content):
        issue_num = match.group(1)
        issue_type = match.group(2)
        issue_title = match.group(3).strip()
        
        # Find the full section for this issue
        start_pos = match.start()
        # Look for the next numbered item or section
        next_match = re.search(r'\n\d+\.\s\*\*\[', content[start_pos + 1:])
        end_pos = start_pos + next_match.start() + 1 if next_match else len(content)
        
        section = content[start_pos:end_pos].strip()
        
        # Extract labels
        label_match = re.search(r'Labels:\s*`([^`]+)`', section)
        labels = []
        if label_match:
            labels = [label.strip() for label in label_match.group(1).split(',')]
        
        # Extract priority
        priority = 'medium'  # default
        if 'priority-critical' in section:
            priority = 'critical'
        elif 'priority-high' in section:
            priority = 'high'
        elif 'priority-low' in section:
            priority = 'low'
        
        # Extract phase
        phase = 'unknown'
        if 'phase-1' in section:
            phase = 'phase-1-foundation'
        elif 'phase-2' in section:
            phase = 'phase-2-characters'
        elif 'phase-3' in section:
            phase = 'phase-3-atlas'
        elif 'phase-4' in section:
            phase = 'phase-4-evaluation'
        elif 'phase-5' in section:
            phase = 'phase-5-polish'
        
        issues.append({
            'number': int(issue_num),
            'type': issue_type,
            'title': issue_title,
            'body': section,
            'labels': labels + [phase, f'priority-{priority}', 'kanban-sync'],
            'github_title': f'[{issue_type}] {issue_title}'
        })
    
    return issues

def sync_with_github(issues: List[Dict], repo_name: str, token: str):
    """Sync issues with GitHub"""
    
    g = Github(token)
    repo = g.get_repo(repo_name)
    
    print(f"Syncing {len(issues)} issues with {repo_name}")
    
    # Get existing issues with kanban-sync label
    existing_issues = list(repo.get_issues(labels=['kanban-sync'], state='all'))
    existing_titles = {issue.title for issue in existing_issues}
    
    print(f"Found {len(existing_issues)} existing kanban issues")
    
    created_count = 0
    skipped_count = 0
    
    for issue in issues:
        github_title = issue['github_title']
        
        if github_title in existing_titles:
            print(f"✓ Skipping existing: {github_title}")
            skipped_count += 1
            continue
        
        try:
            print(f"🆕 Creating: {github_title}")
            created_issue = repo.create_issue(
                title=github_title,
                body=issue['body'],
                labels=issue['labels']
            )
            print(f"   → Created issue #{created_issue.number}")
            created_count += 1
            
        except Exception as e:
            print(f"❌ Error creating {github_title}: {e}")
    
    print(f"\n📊 Summary:")
    print(f"   Created: {created_count}")
    print(f"   Skipped: {skipped_count}")
    print(f"   Total: {len(issues)}")

def main():
    # Get environment variables
    token = os.getenv('GITHUB_TOKEN')
    repo_name = os.getenv('GITHUB_REPO', 'Spiritbocs/poetoybocs')
    
    if not token:
        print("Error: GITHUB_TOKEN environment variable not set")
        print("Create a personal access token at: https://github.com/settings/tokens")
        sys.exit(1)
    
    kanban_file = 'KANBAN.md'
    if not os.path.exists(kanban_file):
        print(f"Error: {kanban_file} not found")
        sys.exit(1)
    
    print(f"🔄 Parsing {kanban_file}...")
    issues = parse_kanban_md(kanban_file)
    
    if not issues:
        print("No issues found in KANBAN.md")
        return
    
    print(f"📋 Found {len(issues)} issues to sync")
    
    sync_with_github(issues, repo_name, token)
    
    print("✅ Sync complete!")

if __name__ == '__main__':
    main()
