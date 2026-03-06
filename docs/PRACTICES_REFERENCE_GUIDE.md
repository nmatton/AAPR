# Practices Reference Guide

## Overview

The **Practices Reference** is a comprehensive catalog of agile and lean practices that organizations can adopt. Each practice is documented with structured metadata that describes its purpose, how to execute it, who's involved, success criteria, and related practices.

This guide documents the schema and structure of the practices reference JSON.

---

## JSON Structure

Each practice is defined as a JSON object with the following fields:

### Core Identity Fields

#### `name` (String, Required)
Unique identifier for the practice.

**Example:** `"Daily Stand-up"`, `"User Story Mapping"`, `"A3 Report"`

---

#### `type` (String, Required)
Categorizes the practice by its primary function.

**Possible Types:**

  - Product Discovery & Strategy: Practices aimed at understanding user needs, defining the product vision, designing the product, and exploring opportunities (e.g., Story Mapping, Value Proposition Canvas).
  - Planning & Prioritization: Practices used to organize work, define what needs to be done, estimate effort, and prioritize high-value items (e.g., Sprint Planning, Planning Poker, MoSCoW).
  - Engineering & Delivery: Technical practices related to software creation, architecture, code quality, testing, and deployment (e.g., TDD, Continuous Integration).
  - Teamwork & Culture: Practices related to human dynamics, team cohesion, daily collaboration, and value alignment (e.g., Pair Programming, Team Canvas).
  - Continuous Improvement & Problem Solving: Practices aimed at inspecting past work, identifying root causes of issues, and adapting processes for the future (e.g., Sprint Retrospective, 5 Whys).
  - Governance, Management & Risk: Practices dedicated to systemic management, workflow tracking, risk reduction, and stakeholder alignment (e.g., Visualize Workflow/Kanban, RACI Matrix).
  - Meeting Facilitation & Workshops: Agnostic meeting formats, ideation techniques, or structured discussion frameworks (e.g., Lean Coffee, Dot Voting).
  - Analysis & Measurement: Practices focused on data collection, metrics, and experimentation to validate hypotheses or measure performance (e.g., Burnup Chart, A/B Testing).



---

#### `objective` (String, Required)
A concise, one-sentence summary of the practice's goal.

**Example:** `"Synchronize the team and identify blockers"`

---

#### `description` (String, Required)
Full, detailed explanation of the practice—what it is, why it matters, how it works, and its context.

**Example:** 
> "Each day at the same time, the team meets so as to bring everyone up to date on the information that is vital for coordination: each team member briefly describes any "completed" contributions and any obstacles that stand in their way..."

---

### Framework & Classification

#### `method` (String, Optional)
The framework or methodology this practice belongs to.

**Valid Values:**
- "Scrum",
- "Kanban",
- "XP",
- "Lean",
- "Scaled Agile",
- "Product Management",
- "Design Thinking & UX",
- "Project Management",
- "Agile",
- "Facilitation & Workshops"

for more details see [raw_practices/framework_methods.md](raw_practices/framework_methods.md).

---

#### `tags` (Array of Strings, Required)
Behavioral and experiential characteristics describing "how it feels to participate" rather than business outcomes. Used to filter practices based on participant preferences.

* **Written / Async-Ready:** Effective communication can be achieved through writing or offline contributions, which reduces social anxiety and allows for thoughtful responses. 
* **Visual / Tactile:** Utilizes physical or digital boards and diagrams to visualize workflows, enhancing communication and simplifying complex tasks. 
* **Verbal-Heavy:** Relies on real-time verbalization and debate, ideal for extroverts or addressing communication-intensive blockages. 
* **Remote-Friendly:** Standardizes accessible communication for remote work, preventing isolated team silos.
* **Co-located / On-Site:** Requires in-person presence to address friction and resolve systemic latencies that are challenging to fix remotely. 
* **Small Group / Pair:** Conducted in small groups of 2-3 to ensure psychological safety for juniors, facilitate skill transfer, and eliminate silos. 
* **Whole Crowd:** Requires the entire team's presence for global alignment, but limit exposure for introverts as it is energy-consuming. 
* **Solo-Capable:** Individually performed before sharing, restoring autonomy and deep technical flow to experts hindered by group synchronization. 
* **Structured / Facilitated:** Uses a clear agenda and facilitator to create a strong framework, adding meaning to the ritual and avoiding bureaucratic drift. 
* **Time-Boxed:** Enforces brief durations to minimize time loss and ensure high cognitive engagement, bypassing institutional delays. 
* **Gamified:** Utilizes rules, turns, or props to depersonalize debates and abstract concepts, ideal for analytical profiles that dismiss emotional approaches. 
* **Spontaneous / Improv:**Requires quick thinking and brainstorming, fulfilling experts' need for freedom from cumbersome processes. 
* **High Visibility:** Presenting work to a large or hierarchical group requires careful management to avoid triggering impostor syndrome. 
* **Consensus-Driven:** Requires full team alignment or compromise before concluding, ensuring quality but may exhaust impatient individuals. 
* **Critical / Introspective:**Evaluates past work or peers for post-mortem analysis, requiring careful timing to prevent emotional overload. 
* **Role-Fluid:**Rotate administrative duties to prevent technical experts from becoming locked into roles that erode their skills.
* **Fast-Feedback:** Utilizes ultra-short feedback loops to reduce stagnation and frustration from long wait times. 
* **User-Feedback Oriented:** Direct, frequent contact with end-users to rapidly adapt products and fulfill the team's need for recognition. 
* **Documented / Traceable:** Creates a searchable, long-term project memory to bring order and reduce chaos-related anxiety. 
* **Maintenance-Aware:** Integrates and manages technical debt and legacy systems to minimize friction from neglecting them. 

see [raw_practices/tags-description.md](raw_practices/tags-description.md) for detailed tag descriptions.

---

#### `practice_goal` (Array of Strings, Required)
List of strategic or organizational goals this practice contributes to achieving.

* **1.1 Code Quality & Simple Design:** Maintaining clean, standardized code.
* **1.2 Automation & CI:** Frequent merging and testing to prevent bottlenecks.
* **1.3 Technical Debt Management:** Continuously improving internal architecture.
* **1.4 Technical Collective Ownership:** Shared architectural responsibility to eliminate single points of failure.
* **2.1 Psychological Safety:** Fostering high trust, transparency, and a blame-free culture.
* **2.2 Self-Organization & Autonomy:** Decentralized decision-making without micromanagement.
* **2.3 Cross-Functionality:** End-to-end team skills to eliminate external dependencies.
* **2.4 Sustainable Pace:** Maintaining a predictable rhythm to prevent burnout.
* **3.1 Flow & Delivery Cadence:** Rapid, regular, and simple delivery of working software.
* **3.2 Inspection & Adaptation:** Continuous evaluation and correction of team workflows.
* **3.3 Work Transparency:** Making tasks, progress, and blockers highly visible.
* **4.1 Customer Involvement:** Continuous collaboration and feedback processing with users.
* **4.2 Value-Driven Prioritization:** Defining product direction to deliver the highest-impact features first.

For more details, see [raw_practices/practices_goals-description.md](raw_practices/practices_goals-description.md).

---

### Execution Details

#### `activities` (Array of Objects, Required)
Ordered steps describing how to execute the practice.

**Structure:**
```json
{
  "sequence": 1,
  "name": "Step Name",
  "description": "What to do and how"
}
```

- **`sequence`** (Number) – Order of execution (1, 2, 3, ...)
- **`name`** (String) – Brief step title
- **`description`** (String) – Detailed explanation of the activity

**Example:**
```json
"activities": [
  { "sequence": 1, "name": "Gather Team", "description": "Meet at the board" },
  { "sequence": 2, "name": "Review Progress", "description": "3 questions format" }
]
```

---

#### `roles` (Array of Objects, Required)
Identifies people or roles involved in the practice and their level of involvement.

**Structure:**
```json
{
  "role": "Role Name",
  "responsibility": "Responsibility Type"
}
```

- **`role`** (String) – Title of the person/function (e.g., "Developer", "Product Owner")
- **`responsibility`** (String) – Level of involvement in this specific practice

**Valid Responsibility Types (RACI Framework):**
- `"Responsible"` – Does the work
- `"Accountable"` – Answerable for the outcome; final decision maker
- `"Consulted"` – Provides input and expertise; asked for opinions
- `"Informed"` – Kept in the loop; notified of outcomes

---

#### `work_products` (Array of Objects, Required)
Artifacts, documents, or outputs created or used by the practice.

**Structure:**
```json
{
  "name": "Artifact Name",
  "description": "What it is and its purpose"
}
```

**Examples:**
- `{ "name": "Sprint Backlog", "description": "List of items to complete in the sprint" }`
- `{ "name": "User Story Map", "description": "Visual map of user journey and features" }`

---

#### `completion_criteria` (String, Required)
Definition of Done—clear criteria that indicate the practice has been completed successfully.

**Example:** `"Timebox respected and blockers documented"`

---

### Metrics & Success

#### `metrics` (Array of Objects, Required)
Formulas or measurements to track success and progress.

**Structure:**
```json
{
  "name": "Metric Name",
  "unit": "Unit of Measurement",
  "formula": "How to calculate"
}
```

**Example:**
```json
{
  "name": "Meeting Duration",
  "unit": "Minutes",
  "formula": "End Time - Start Time"
}
```

---

### Resources & Learning

#### `resources` (Object, Required)
Guidance, pitfalls, and benefits associated with the practice.

**Structure:**
```json
{
  "guidelines": [
    { "name": "Title", "url": "Link", "type": "Resource Type" }
  ],
  "pitfalls": ["Common mistake 1", "Common mistake 2"],
  "benefits": ["Benefit 1", "Benefit 2"]
}
```

##### Guidelines/Resources
External references for learning or implementing the practice.

**Structure:**
```json
{
  "name": "Resource Title",
  "url": "https://example.com",
  "type": "Resource Type"
}
```

- **`name`** (String) – Title of the resource
- **`url`** (String) – Link to the resource (only include if available)
- **`type`** (String) – Category of the resource

**Valid Resource Types:**
- `"Blog Post"` – Blog article or web post
- `"Book"` – Physical or digital book
- `"Wiki"` – Wiki-based documentation
- `"Scientific Article"` – Peer-reviewed research
- `"Video"` – Video tutorial or presentation

##### Pitfalls
Common mistakes or challenges when implementing this practice.

**Example:**
- `"Talking to manager instead of team"`
- `"Treating it as a form to fill out"`

##### Benefits
Value propositions and positive outcomes of using this practice.

**Example:**
- `"Everyone knows what is going on"`
- `"Standardized problem solving"`

---

### Practice Relationships

#### `associated_practices` (Array of Objects, Required)
Other practices that relate to this one.

**Structure:**
```json
{
  "name": "Target Practice Name",
  "association_type": "Association Type"
}
```

- **`name`** (String) – Name of the related practice
- **`association_type`** (String) – Type of relationship

**Valid Association Types:**
- `"Configuration"` – Can be combined or configured together
- `"Equivalence"` – Alternative practices that achieve similar goals
- `"Dependency"` – One practice depends on or requires another
- `"Complementarity"` – Practices that enhance each other
- `"Exclusion"` – Practices that conflict or shouldn't be used together

---

## Complete Example

```json
{
  "name": "Daily Stand-up",
  "type": "Planning & Prioritization",
  "objective": "Synchronize the team and identify blockers",
  "description": "Each day at the same time, the team meets so as to bring everyone up to date on the information that is vital for coordination: each team member briefly describes any 'completed' contributions and any obstacles that stand in their way. This meeting is normally timeboxed to a maximum duration of 15 minutes, though this may need adjusting for larger teams. To keep the meeting short, any topic that starts a discussion is cut short, added to a 'parking lot' list, and discussed in greater depth after the meeting, between the people affected by the issue.",
  "method": "Scrum",
  "tags": [
    "Visual / Tactile",
    "Remote-Friendly",
    "Structured / Facilitated"
  ],
  "practice_goal": [
    "Flow & Delivery Cadence",
    "Work Transparency",
    "Self-Organization & Autonomy"
  ],
  "activities": [
    {
      "sequence": 1,
      "name": "Gather Team",
      "description": "Meet at the board or scheduled location at the agreed time"
    },
    {
      "sequence": 2,
      "name": "Review Progress",
      "description": "Each member answers: What did I complete? What will I do next? What blocks me?"
    }
  ],
  "roles": [
    {
      "role": "Developer",
      "responsibility": "Responsible"
    },
    {
      "role": "Scrum Master",
      "responsibility": "Accountable"
    }
  ],
  "work_products": [
    {
      "name": "Sprint Backlog",
      "description": "Updated list of tasks and their status"
    }
  ],
  "completion_criteria": "All team members have reported; timebox (15 min) respected; blockers captured",
  "metrics": [
    {
      "name": "Meeting Duration",
      "unit": "Minutes",
      "formula": "End Time - Start Time"
    },
    {
      "name": "Blockers Identified",
      "unit": "Count",
      "formula": "Number of obstacles reported"
    }
  ],
  "resources": {
    "guidelines": [
      {
        "name": "Scrum Guide",
        "url": "https://scrumguides.org",
        "type": "Wiki"
      }
    ],
    "pitfalls": [
      "Talking to manager instead of team",
      "Exceeding timebox with detailed discussions",
      "Skipping the meeting when team is co-located"
    ],
    "benefits": [
      "Everyone knows what is going on",
      "Blockers are surfaced early",
      "Team coordination improves"
    ]
  },
  "associated_practices": [
    {
      "name": "Sprint Planning",
      "association_type": "Dependency"
    },
    {
      "name": "Sprint Review",
      "association_type": "Complementarity"
    }
  ]
}
```

---

## Usage Guidelines

### For Practice Creators
- Ensure all required fields are populated
- Use precise, measurable language
- Provide realistic, actionable activities
- List actual resources (do not infer or suppose links)
- Define clear completion criteria

### For Practice Adopters
- Review the `tags` to understand the experience profile
- Follow activities in `sequence` order
- Verify roles and responsibilities match your team structure
- Track the listed `metrics` to measure success
- Be aware of common `pitfalls` to avoid

### For Practice Curators
- Monitor `associated_practices` to ensure consistency
- Update `practice_goal` mappings when organizational goals change
- Regularly review and validate resource links
- Gather community feedback on pitfalls and benefits

---

## Version History

**Created:** January 19, 2026
**Last Updated:** March 03, 2026

---

## Related Documentation

See also:
- [Project Overview](01-project-overview.md)
- [Architecture](03-architecture.md)
- [Development Guide](08-development-guide.md)
