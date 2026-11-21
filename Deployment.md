
# ADMatrix PROPERTY

## Master Product Development & Engineering Instructions

You are acting as a Principal Software Architect, Senior Full-Stack Engineer, UI/UX Designer, and Product Engineer.

Your responsibility is to design and build **Admatrix Property**, a premium, production-oriented SaaS platform for real estate advertising automation, specifically designed for the Dubai real estate market.

This is a completely GREENFIELD project.

Build everything from scratch. Do not assume that any existing application, backend, database, component library, or business logic is available.

---

# 1. PRODUCT VISION

Admatrix Property is a real estate advertising automation platform that enables Dubai property brokers to transform property listings into compliant, professional advertising campaigns across Meta and Google.

The platform automates:

1. Property listing management.
2. Trakheesi compliance validation.
3. AI-powered English and Arabic advertisement generation.
4. Property advertisement creative generation.
5. Meta and Google campaign management.
6. Lead capture and management.
7. WhatsApp Business integration.
8. Advertising analytics and reporting.

The central product workflow is:

PROPERTY LISTING → COMPLIANCE VALIDATION → AI AD GENERATION → CREATIVE STUDIO → CAMPAIGN LAUNCH → LEAD CAPTURE → WHATSAPP → ANALYTICS

The application must be designed for actual commercial usage, not as a static prototype.

# 2. DESIGN PHILOSOPHY: EXTREMELY IMPORTANT

The UI/UX quality is a major product requirement.

Build a premium, modern SaaS application comparable in design quality to Linear, Stripe, Attio, Ramp and modern HubSpot.

Do not create a generic Bootstrap admin dashboard.

## Visual direction

- Premium, minimal, sophisticated and modern.
- Strong typography and excellent visual hierarchy.
- Generous whitespace.
- Carefully balanced layouts.
- Beautiful cards and structured information panels.
- Subtle shadows, borders and depth.
- Smooth transitions and micro-interactions.
- Consistent spacing throughout the application.
- Professional data visualization.
- High-quality icons.
- Beautiful empty states and loading states.

## Suggested visual identity

Use a light-first interface.

Suggested palette:

- Primary background: #F7F8FA
- Main surface: #FFFFFF
- Primary text: #151923
- Secondary text: #737B8C
- Borders: #E8EAF0
- Primary accent: #635BFF
- Secondary accent: #8B7CFF
- Success: #16A36A
- Warning: #E5A12B
- Error: #E05252

These are initial design tokens, not rigid restrictions. Maintain visual consistency.

Use:

- Inter or Geist typography.
- Lucide icons.
- Consistent 8px spacing system.
- 10–14px card corner radii.
- Subtle hover and focus states.
- Smooth but restrained animations.

Avoid:

- Excessive gradients.
- Too many colorful cards.
- Giant headings inside every card.
- Unnecessary borders.
- Overloaded dashboards.
- Randomly different button styles.
- Emoji used as interface icons.
- Excessive animations.
- Cluttered tables.

## Layout architecture

Create a persistent application shell consisting of:

1. Left navigation sidebar.
2. Top header/navigation bar.
3. Main content area.
4. Contextual actions.
5. Responsive mobile navigation.

Sidebar should be collapsible on desktop.

Navigation should be logically grouped:

WORKSPACE

- Overview
- Properties
- Ad Studio
- Campaigns
- Leads
- Analytics

MANAGEMENT

- Team
- Integrations

SETTINGS

- Account Settings
- Billing
- Help & Support

The sidebar must clearly highlight the active section.

The header should contain:

- Page title or breadcrumb.
- Global search.
- Notifications.
- Help.
- User profile and account menu.

Do not force every page into the same card layout. Use layouts appropriate to each task.

# 3. USER TYPES AND ACCESS CONTROL

Build a multi-tenant SaaS architecture.

Initially support:

### A. Individual Broker

- Own account.
- Own property listings.
- Own advertising campaigns.
- Own leads.
- Own performance reports.
- Own integrations.

### B. Brokerage Admin

- Manage brokerage profile.
- Invite and manage agents.
- View team properties.
- View team campaigns.
- Assign leads.
- Manage brand templates.
- Configure approval workflows.
- View brokerage-wide analytics.

### C. Broker/Agent

- Belongs to a brokerage.
- Manages assigned listings.
- Creates advertisements.
- Requests campaign approvals.
- Manages assigned leads.

### D. Platform Super Admin

- Manage all users and brokerages.
- View platform activity.
- Manage system configurations.
- Monitor integrations.
- Review audit logs.
- Handle support and account issues.

Implement role-based access control.

Every tenant-owned resource must be scoped to the correct organization. Never rely on frontend restrictions alone for access control.

# 4. MODULE 1: AUTHENTICATION AND ONBOARDING

Build a complete authentication system.

Features:

- Registration.
- Login.
- Logout.
- Forgot password.
- Password reset.
- Email verification.
- Session management.
- Protected routes.
- Role-based redirects.

Onboarding workflow:

Step 1: Create account.
Step 2: Select account type (individual broker or brokerage).
Step 3: Enter personal/business information.
Step 4: Enter brokerage information where applicable.
Step 5: Connect advertising accounts (can be skipped initially).
Step 6: Complete onboarding.

Collect relevant details:

- Full name.
- Email.
- Phone number.
- Brokerage name.
- Brokerage licence information.
- Account type.

Create a polished multi-step onboarding experience with a progress indicator.

# 5. MODULE 2: DASHBOARD / OVERVIEW

Create a beautiful, informative dashboard.

It should provide a snapshot of the broker's advertising activity.

Key KPI cards:

- Total active listings.
- Active campaigns.
- Total advertising spend.
- Total leads generated.
- Average cost per lead.
- Campaign performance.

Dashboard sections:

### Performance overview

- Spend over time.
- Leads over time.
- Cost per lead.
- Campaign performance comparison.

### Recent campaigns

Show:

- Campaign name.
- Associated property.
- Platform.
- Status.
- Budget.
- Spend.
- Leads.

### Recent leads

Show:

- Lead name.
- Property.
- Source.
- Date.
- Status.

### Property activity

Show recently created and updated listings.

### Quick actions

- Add property.
- Create advertisement.
- Launch campaign.
- View leads.

Use realistic data structures. Clearly distinguish actual data from demo/seed data.

# 6. MODULE 3: PROPERTY MANAGEMENT

This is the foundation of the product.

Build a complete property management system.

## Property listing overview

Display properties in a visually appealing table or grid.

Each property should display:

- Cover image.
- Property title.
- Location.
- Property type.
- Price.
- Listing status.
- Permit status.
- Number of campaigns.
- Date created.

Support:

- Search.
- Filters.
- Sorting.
- Pagination.
- Grid/list toggle.
- Create property.
- Edit property.
- Archive/delete property.
- View property details.

## Property creation workflow

Create a multi-step property creation experience.

### Step 1: Basic information

- Property title.
- Property description.
- Property type.
- Listing type (sale/rent).
- Price.
- Currency.
- Bedrooms.
- Bathrooms.
- Built-up area.
- Furnishing status.

### Step 2: Location

- Emirate.
- Area/community.
- Building/project.
- Address.
- Location/map coordinates where available.

### Step 3: Media

- Upload multiple images.
- Select cover image.
- Reorder images.
- Remove images.
- Preview uploaded media.

### Step 4: Compliance

- Trakheesi permit number.
- Permit expiry date.
- Official Madmoun QR code upload.
- Form A confirmation.
- Brokerage licence details where applicable.

### Step 5: Off-plan details

Display conditionally for off-plan properties:

- Developer name.
- Escrow account number.
- Expected completion date.

### Step 6: Review and save

Display all information in a clear summary before saving.

Allow drafts.

Do not lose form data when navigating between steps.

# 7. MODULE 4: TRAKHEESI COMPLIANCE ENGINE

Compliance is one of the most important differentiators of Admatrix Property.

Build a centralized compliance service.

Required checks:

1. Trakheesi permit number is present.
2. Permit expiry date is valid.
3. Official QR code is uploaded.
4. Form A confirmation is completed.
5. Required listing information is present.
6. Off-plan properties contain developer name, escrow account and completion date.
7. Relevant brokerage licence information is recorded.

Build clear compliance statuses:

- Not Started.
- Incomplete.
- Pending Review.
- Compliant.
- Expired.
- Action Required.

Display specific reasons when validation fails.

For example:

"Campaign cannot be launched. The Trakheesi permit has expired."

The compliance engine must block campaign launch when mandatory checks fail.

Maintain an audit log of compliance confirmations and changes.

IMPORTANT:
Do not claim to verify permits directly with Dubai Land Department unless an official verification integration is implemented and available.

Initially, implement field validation, expiry checks, uploaded-document checks and broker confirmations.

Treat regulatory requirements as configurable rules. They should not be scattered across frontend components.

# 8. MODULE 5: AI AD STUDIO

This is one of the primary product experiences.

Build a premium AI-powered advertisement creation studio.

The experience should feel like a professional creative tool, not a basic text-generation form.

## Workflow

Step 1: Select an existing property.

Step 2: Select advertising platform:

- Instagram.
- Facebook.
- Google.

Step 3: Select language:

- English.
- Arabic.
- Both.

Step 4: Configure advertisement:

- Campaign objective.
- Target audience context.
- Tone of voice.
- Key selling points.
- Call to action.

Step 5: Generate advertisement copy.

Generate:

- Headlines.
- Primary text.
- Descriptions.
- CTA suggestions.
- Multiple copy variations.

Use an LLM API through a secure backend service.

Do not hardcode generated responses.

## Creative generation

Generate professional property advertisement creatives using:

- Property images.
- Property information.
- AI-generated copy.
- Brand information.
- Trakheesi permit number.
- Official QR code.

Initial formats:

- 1080 × 1080 square.
- 1080 × 1350 portrait.
- 1080 × 1920 story.

Build a server-side rendering service for consistent image output.

Do not rely on AI image generation to render critical text, permit numbers or QR codes.

Use deterministic rendering to ensure text and QR codes remain accurate and readable.

## Creative editor

Allow users to:

- Edit text.
- Change text placement.
- Change font sizes.
- Change background and overlay.
- Select from design templates.
- Preview each format.
- Switch between English and Arabic.
- Download PNG creatives.

Arabic must support correct right-to-left layout.

Allow users to regenerate copy without losing their existing creative configuration.

Design the creative editor as a proper workspace with:

- Template/asset panel.
- Main preview canvas.
- Editing controls.
- Format switcher.
- Save and export actions.

# 9. MODULE 6: CAMPAIGN MANAGEMENT

Build a dedicated campaign management section.

## Campaign creation workflow

Step 1: Select property.

Step 2: Select advertising platform:

- Meta.
- Google.
- Both, where supported by the configured workflow.

Step 3: Select creative.

Step 4: Configure campaign:

- Campaign name.
- Objective.
- Daily or lifetime budget.
- Currency.
- Start date.
- End date.
- Location targeting.
- Audience settings.
- Ad placement settings.

Step 5: Compliance validation.

Step 6: Review campaign.

Step 7: Launch.

## Meta integration

Integrate Meta Marketing API.

Required capabilities:

- OAuth/account connection.
- Retrieve accessible ad accounts.
- Retrieve relevant pages.
- Create campaigns.
- Create ad sets.
- Upload creative assets.
- Create advertisements.
- Retrieve campaign status.
- Retrieve performance insights.
- Pause/resume campaigns where supported.

Respect Meta's advertising policies for housing-related advertisements in the UAE.

Do not implement unrestricted audience targeting.

## Google integration

Integrate Google Ads API.

Required capabilities:

- Account connection.
- Retrieve accessible customer accounts.
- Create supported campaigns.
- Configure budgets.
- Upload supported assets.
- Retrieve performance data.
- Pause/resume campaigns.

Use official API documentation to determine supported campaign formats and requirements.

## Campaign states

Support:

- Draft.
- Pending Approval.
- Compliance Failed.
- Ready to Launch.
- Publishing.
- Active.
- Paused.
- Completed.
- Rejected.
- Failed.

Implement proper API error handling and publishing logs.

Never mark a campaign as active until the advertising platform confirms successful creation and publication.

# 10. MODULE 7: LEAD MANAGEMENT

Build a lightweight but effective lead management system.

## Lead inbox

Display:

- Lead name.
- Phone number.
- Email.
- Property.
- Campaign.
- Advertising source.
- Date received.
- Lead status.
- Assigned broker.

Provide:

- Search.
- Filters.
- Sorting.
- Pagination.
- Lead detail view.

## Lead statuses

- New.
- Contacted.
- Interested.
- Follow-up.
- Qualified.
- Converted.
- Lost.

## Lead details

Show:

- Contact information.
- Associated property.
- Campaign source.
- Lead creation time.
- Communication history.
- Internal notes.
- Assigned broker.
- Status history.

## Lead attribution

Every lead should be associated with:

- Property ID.
- Campaign ID.
- Advertising platform.
- Ad/ad-set identifier where available.
- Broker ID.
- Brokerage ID where applicable.

Do not assume every platform provides identical lead fields.

# 11. MODULE 8: WHATSAPP BUSINESS INTEGRATION

Integrate the official WhatsApp Business Platform.

Required capabilities:

1. Connect business account.
2. Configure approved messaging templates.
3. Receive supported lead events.
4. Send WhatsApp notifications.
5. Send approved automated replies.
6. Track delivery and messaging status where available.
7. Maintain communication history.

Build automated workflows:

When a new lead arrives:

- Create lead record.
- Assign the appropriate broker.
- Send broker notification.
- Send an approved customer reply where consent and platform rules permit.
- Update communication history.

Provide a WhatsApp action inside the lead details page.

Do not assume that a normal WhatsApp URL provides automated messaging functionality.

# 12. MODULE 9: ANALYTICS AND REPORTING

Create a professional analytics dashboard.

KPIs:

- Total ad spend.
- Total impressions.
- Total clicks.
- Total leads.
- Average CPC.
- Average CPL.
- CTR.
- Conversion metrics where supported.

Provide:

- Date range filters.
- Platform comparison.
- Campaign comparison.
- Property-level performance.
- Broker-level performance.
- Brokerage-level performance.

Charts:

- Spend over time.
- Leads over time.
- Cost per lead trends.
- Platform performance.
- Campaign performance.

Support downloadable reports.

Clearly distinguish platform-reported metrics from calculated metrics.

# 13. MODULE 10: BROKERAGE AND TEAM MANAGEMENT

Build brokerage-level management functionality.

Features:

- Create brokerage.
- Invite agents.
- Accept/reject invitations.
- Assign roles.
- Assign properties.
- Assign leads.
- View team campaigns.
- Manage branding.
- Create brand templates.
- Configure approval workflows.
- View team analytics.

Support manager approval before campaigns are launched when configured.

Enforce tenant-level data isolation.

# 14. SETTINGS AND INTEGRATIONS

Build a comprehensive settings area.

Sections:

### Profile

Personal details and account information.

### Brokerage

Company details, branding and licence information.

### Advertising accounts

Meta and Google connections.

### WhatsApp

Business account and messaging configuration.

### Notifications

Email and WhatsApp preferences.

### Security

Password, sessions and security settings.

### Billing

Subscription plan, payment status and invoices.

### Team

User invitations, roles and access management.

# 15. TECHNICAL ARCHITECTURE

Use the following suggested stack unless the repository or deployment requirements justify a documented alternative.

## Frontend

- Next.js with TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- React Hook Form.
- Zod validation.
- TanStack Query.
- Recharts for analytics.

## Backend

- Node.js.
- TypeScript.
- NestJS or a well-structured Next.js backend architecture.
- REST APIs.
- Background job processing.

Prefer a modular monolith initially. Do not introduce unnecessary microservice complexity.

## Database

- PostgreSQL.
- Prisma ORM or Drizzle ORM.
- Proper relational modelling.
- Database migrations.
- Tenant-level data isolation.

## Storage

- S3-compatible object storage for property images and generated creatives.

## AI

- LLM provider integration through backend services.
- Structured outputs for advertisement generation.
- Prompt templates.
- Output validation.
- Token/cost monitoring.

## Background jobs

Use a job queue for:

- Campaign publishing.
- Performance synchronization.
- WhatsApp events.
- Creative rendering.
- Lead processing.

## Security

- Secure authentication.
- Role-based authorization.
- Tenant isolation.
- Server-side input validation.
- Rate limiting.
- Secure OAuth token storage.
- Encryption of sensitive credentials.
- Webhook signature verification.
- Audit logging.
- Secrets stored in environment variables.

Never expose API keys or access tokens to the browser.

# 16. DATA MODEL

Design a normalized database around the following entities:

- User
- Organization
- OrganizationMembership
- BrokerageProfile
- BrokerProfile
- Property
- PropertyImage
- PropertyPermit
- ComplianceCheck
- ComplianceAuditLog
- AdCreative
- AdCopy
- CreativeTemplate
- IntegrationAccount
- AdvertisingAccount
- Campaign
- AdSet
- Advertisement
- CampaignMetric
- Lead
- LeadAssignment
- LeadActivity
- WhatsAppConversation
- WhatsAppMessage
- Notification
- Subscription
- Invoice
- AuditLog

Use UUID identifiers.

Include:

- createdAt.
- updatedAt.
- organizationId where applicable.
- createdBy where applicable.
- Proper indexes.
- Foreign key constraints.
- Appropriate unique constraints.

Avoid storing duplicated information unnecessarily.

# 17. UI/UX PAGE REQUIREMENTS

Every page must be designed as a real product experience.

Build:

1. Login.
2. Registration.
3. Multi-step onboarding.
4. Dashboard.
5. Properties list.
6. Property creation.
7. Property details.
8. Compliance review.
9. Ad Studio.
10. Creative editor.
11. Campaign list.
12. Campaign creation wizard.
13. Campaign details.
14. Lead inbox.
15. Lead details.
16. Analytics.
17. Team management.
18. Integrations.
19. Profile settings.
20. Brokerage settings.
21. Billing.
22. Notifications.
23. Platform administration.

## Interaction standards

Every interactive element must work.

Do not create:

- Buttons without actions.
- Fake dropdowns.
- Decorative search bars.
- Non-functional filters.
- Dead navigation links.
- Fake integration connection buttons.
- Static forms that do not submit.

Every form must have:

- Validation.
- Loading state.
- Success feedback.
- Error feedback.
- Proper submission handling.

Every data table must have:

- Loading state.
- Empty state.
- Error state.
- Pagination where relevant.

Use skeleton loading where appropriate.

Use confirmation dialogs for destructive actions.

Support keyboard accessibility and responsive layouts.

# 18. DEVELOPMENT METHODOLOGY

Do not attempt to generate the entire application in one massive code-generation operation.

Work incrementally.

## Phase 1: Project foundation

- Inspect environment.
- Initialize application.
- Configure TypeScript.
- Configure styling.
- Establish folder structure.
- Build design system.
- Configure database.
- Implement authentication.

## Phase 2: Core application

- Application shell.
- Sidebar.
- Header.
- Dashboard.
- Property management.
- Database persistence.

## Phase 3: Compliance

- Compliance data model.
- Validation service.
- Compliance UI.
- Audit history.
- Launch restrictions.

## Phase 4: AI Studio

- AI service.
- Prompt management.
- English/Arabic generation.
- Creative rendering.
- Creative editor.
- Export functionality.

## Phase 5: Campaign management

- Meta integration.
- Google integration.
- Campaign creation.
- Publishing workflows.
- Campaign synchronization.

## Phase 6: Leads and WhatsApp

- Lead ingestion.
- Lead inbox.
- Lead assignments.
- WhatsApp integration.
- Automated workflows.

## Phase 7: Analytics and brokerage

- Reporting.
- Team accounts.
- Roles and permissions.
- Approval workflows.

## Phase 8: Production readiness

- Security testing.
- API testing.
- End-to-end testing.
- Performance optimization.
- Deployment.
- Monitoring.
- Documentation.

# 19. IMPORTANT ENGINEERING RULES

1. Build actual functionality, not just UI mockups.
2. Never use hardcoded data as a substitute for database persistence.
3. Demo data may be used for development, but clearly isolate it.
4. Never expose credentials in frontend code.
5. Never assume an external API call succeeded.
6. Handle API failures gracefully.
7. Use proper TypeScript types.
8. Keep components reusable.
9. Keep business logic outside presentation components.
10. Use centralized validation and error handling.
11. Maintain clear documentation.
12. Avoid unnecessary dependencies.
13. Do not duplicate business logic.
14. Do not build a microservice architecture prematurely.
15. Test important business workflows.
16. Never bypass compliance checks to make a demo work.
17. Never falsely display a campaign as published.
18. Preserve existing working functionality when making subsequent changes.

# 20. EXPECTED FIRST ACTION

Before implementing features:

1. Inspect the development environment.
2. Confirm the project directory and available tools.
3. Initialize the greenfield project.
4. Establish the application architecture.
5. Define the database schema.
6. Create the design system.
7. Build the application shell.
8. Implement the first complete vertical slice: authentication → create property → save property → display property.

Present a concise implementation plan and proposed directory structure before major implementation.

Then execute the work phase by phase.

Do not stop after generating a plan. Continue implementing, testing and documenting each phase.

Maintain a DEVELOPMENT_STATUS.md file documenting:

- Completed modules.
- Pending modules.
- Implemented API endpoints.
- Database migrations.
- External integrations.
- Known issues.
- Tests performed.

Update this document after each development milestone.

---

# FINAL PRODUCT EXPECTATION

Admatrix Property must feel like a premium, professionally engineered SaaS product.

A broker should be able to open the application, immediately understand what to do, add a property, generate beautiful advertisements, launch compliant campaigns and manage incoming leads without technical assistance.

The interface must be exceptionally polished, responsive, intuitive and consistent.

The backend must be secure, modular, maintainable and production-oriented.

Build the complete product, not merely a visual demonstration.
