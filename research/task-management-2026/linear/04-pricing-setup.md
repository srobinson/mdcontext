# Linear Pricing and Setup Guide

Research date: January 2026

## Pricing Overview

Linear uses a per-user pricing model with a generous free tier that works well for small teams and open source projects.

### Plan Comparison

| Plan           | Price                         | Key Features                                                                            |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| **Free**       | $0                            | Unlimited members, up to 250 active issues, 2 teams, all integrations, API access       |
| **Basic**      | $8/user/month ($6.40 annual)  | Unlimited issues, 5 teams, admin roles, unlimited file uploads                          |
| **Business**   | $12/user/month ($9.60 annual) | Private teams, guest accounts, Linear Insights analytics, Zendesk/Intercom integrations |
| **Enterprise** | Custom                        | SAML/SCIM, granular security controls, workspace owner role, custom SLAs                |

Annual billing provides a 20% discount.

## Free Plan Details

### What's Included

- **Unlimited members** - No charge for non-technical stakeholders or reviewers
- **Up to 250 active issues** - Archived issues don't count toward this limit
- **Up to 2 teams** - Sufficient for solo/small team organization
- **All integrations** - GitHub, GitLab, Slack, Figma, etc. (no feature gating)
- **API and webhook access** - Full automation capabilities
- **10 MB file upload limit** - Per file

### Key Limitations

1. **250 active issue cap** - Once exceeded, you cannot create new issues until you archive or delete existing ones
2. **2 team limit** - May matter as organization grows
3. **No admin roles** - All members are admins on Free plan
4. **No private teams** - All content visible to all members
5. **No guest accounts** - Cannot add external collaborators with limited access
6. **No template customization** - Default templates only

### Practical Assessment: 250 Issues

The 250 active issue limit sounds restrictive but is quite workable:

- **Archived issues don't count** - Close completed work regularly
- **For a solo developer or small OSS project** - 250 active issues is substantial
- **Good practice anyway** - Forces issue hygiene and prevents backlog bloat

If you maintain a clean backlog (archive completed/stale issues), you can likely stay on Free indefinitely for a small open source project.

## Features Requiring Paid Plans

### Basic Plan ($8/user/month)

- **Unlimited active issues** - No cap on open work
- **Up to 5 teams** - Better organization for growing projects
- **Admin roles** - Control who can manage workspace settings
- **Unlimited file uploads** - No size restrictions

### Business Plan ($12/user/month)

- **Private teams** - Restrict access to sensitive work (e.g., security issues)
- **Guest accounts** - External collaborators with limited access (billed as regular users)
- **Linear Insights** - Analytics and reporting dashboards
- **Linear Asks** - Customer feedback collection
- **Zendesk/Intercom integrations** - Support platform connections

### Enterprise Plan (Custom)

- **SAML/SCIM provisioning** - SSO and automated user management
- **Workspace owner role** - Granular permission control
- **Audit log retention** - Extended compliance features
- **Custom SLAs** - Dedicated support

## Discount Programs

### Nonprofits

- **75% off** Basic and Business plans
- Contact <support@linear.app> with proof of nonprofit status

### Education

- Discounted rates for accredited institutions
- Contact <support@linear.app> from .edu email with proof of status

### Startups

- **Up to 6 months free** through Linear for Startups program
- Requires affiliation with a partner program

### Open Source Projects

- **No dedicated OSS program** publicly advertised
- Contact <support@linear.app> to inquire - they may offer something case-by-case
- The Free tier is often sufficient for OSS project management

## Solo Developer / Small Team Setup

### Quick Start Steps

1. **Sign up** at linear.app (no credit card required)
2. **Create workspace** - Name it after your project
3. **Create one team** (e.g., "Development" or project name)
4. **Connect GitHub** via Settings > Integrations
5. **Start creating issues**

### Recommended Structure for Small OSS Project

```
Workspace: [Project Name]
  Team: Development (or just project name)
    Labels:
      - bug
      - feature
      - documentation
      - enhancement
      - good-first-issue (for contributors)
    Statuses (defaults work well):
      - Backlog
      - Todo
      - In Progress
      - Done
      - Canceled
```

### GitHub Integration (Free)

The GitHub integration is fully available on the Free plan and is highly valuable for OSS projects:

- **Auto-link PRs to issues** - Use issue ID in branch name (e.g., `ABC-123-fix-bug`)
- **Automatic status updates** - Issues move to "In Progress" when PR opens, "Done" when merged
- **Sync GitHub Issues to Linear** - Import community-reported issues
- **Two-way comment sync** - Comments sync between platforms

Setup:

1. Settings > Integrations > GitHub
2. Authenticate and select repositories
3. Enable PR linking and commit linking per team

### Best Practices for Small Teams

1. **Keep cycles short** - 1-2 weeks for momentum
2. **Use clear issue titles** - Start with action verb: "Fix calendar loading bug"
3. **Archive completed work** - Keeps active issue count low (critical for Free plan)
4. **Use projects for milestones** - Group related issues under a project (e.g., "v1.0 Release")
5. **Keyboard shortcuts** - Linear is keyboard-first; learn `Cmd+K` for command palette

### Solo Developer Workflow

- Create a single team for all work
- Use labels to categorize (bug, feature, chore)
- Projects for larger initiatives or releases
- Cycles optional for solo work - use if you want time-boxed sprints

## Assessment for Small OSS Project

### Strengths

- **Generous free tier** - 250 active issues with unlimited archived, unlimited members
- **Full GitHub integration on Free** - Critical for OSS workflow
- **Modern, fast interface** - Developer-friendly design
- **API access on Free** - Automation possibilities
- **No per-seat minimum** - Works for true solo use

### Considerations

- **No dedicated OSS discount** - Unlike some competitors
- **250 active issue limit** - Need disciplined archiving
- **No private teams on Free** - Security issues visible to all members
- **No guest accounts on Free** - External collaborators need full membership

### Recommendation

Linear's Free plan is well-suited for small open source projects that:

- Have a manageable backlog (under 250 active issues with good archiving habits)
- Don't need private security issue tracking
- Want tight GitHub integration
- Value a modern, fast interface

For an OSS project, you likely don't need paid features unless:

- Your active issue count consistently exceeds 250
- You need private teams for security vulnerability tracking
- You want to add external guest collaborators

### Cost Comparison

For a solo developer or 3-person team on annual billing:

- **Free**: $0/month - likely sufficient
- **Basic**: $6.40-$19.20/month (1-3 users) - if you exceed 250 issues
- **Business**: $9.60-$28.80/month (1-3 users) - if you need private teams

## Sources

- [Linear Pricing](https://linear.app/pricing)
- [Linear Billing and Plans Documentation](https://linear.app/docs/billing-and-plans)
- [Linear GitHub Integration](https://linear.app/docs/github-integration)
- [Linear Members and Roles](https://linear.app/docs/members-roles)
- [Linear Private Teams](https://linear.app/docs/private-teams)
- [Linear Start Guide](https://linear.app/docs/start-guide)
- [Linear Insights](https://linear.app/insights)
- [How to Use Linear - Morgen](https://www.morgen.so/blog-posts/linear-project-management)
