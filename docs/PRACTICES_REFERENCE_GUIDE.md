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
- Communication
- Simplicity
- Feedback
- Courage
- Humility
- Transparency
- Inspection
- Adaptation
- Collective Code Ownership
- Continuous Integration
- TDD (test first)
- Refactoring
- Simple Design
- Coding Standards
- Sustainable Pace
- Self-Organization
- Cross-Functional Teams
- Active Stakeholder Participation
- Short Releases


More details on each type can be found in the [Agile Pillars](raw_practices/agile_pillars.md) document.

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
- `"Scrum"`
- `"XP"` (Extreme Programming)
- `"Kanban"`
- `"Lean"`
- `"Design Thinking"`
- `"Product Management"`
- `"DSDM"`
- `"Agile"`
- `""` (empty string if not applicable)

---

#### `tags` (Array of Strings, Required)
Behavioral and experiential characteristics describing "how it feels to participate" rather than business outcomes. Used to filter practices based on participant preferences.

**Valid Tags:**
- `"Visual/Tactile"` – Primarily uses visual materials or tactile/physical engagement
- `"Async-Ready"` – Can be performed asynchronously without real-time synchronization
- `"Structured"` – Follows a defined process or template
- `"Consensus-Driven"` – Requires group agreement
- `"Whole Crowd"` – Involves all team members
- `"Small Group"` – Designed for small team segments
- `"Spontaneous"` – Can be initiated ad-hoc without formal scheduling
- `"Verbal-Heavy"` – Relies primarily on discussion and conversation
- `"Solo-Capable"` – Can be executed individually
- `"Critical"` – Essential practice for team success

see [raw_practices/tags-description.md](raw_practices/tags-description.md) for detailed tag descriptions.

---

#### `practice_goal` (Array of Strings, Required)
List of strategic or organizational goals this practice contributes to achieving.

**Valid Goals:**
- `"Communication"` – Improves information sharing and clarity
- `"Simplicity"` – Reduces complexity in processes or design
- `"Feedback"` – Enables gathering and acting on feedback
- `"Courage"` – Builds confidence to take risks
- `"Humility"` – Promotes learning and openness
- `"Transparency"` – Increases visibility of work and decisions
- `"Inspection"` – Enables observation and measurement
- `"Adaptation"` – Facilitates responding to change
- `"Collective Code Ownership"` – Encourages shared responsibility for code quality
- `"Continuous Integration"` – Supports frequent code integration and testing
- `"TDD (test first)"` – Emphasizes writing tests before implementation
- `"Refactoring"` – Supports code quality improvements
- `"Simple Design"` – Promotes minimalist design approaches
- `"Coding Standards"` – Enforces consistent code quality practices
- `"Sustainable Pace"` – Supports work-life balance and long-term productivity
- `"Self-Organization"` – Empowers teams to organize themselves
- `"Cross-Functional Teams"` – Brings diverse skills together
- `"Active Stakeholder Participation"` – Engages stakeholders actively
- `"Short Releases"` – Supports frequent delivery of value

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
  "type": "Teamwork Practice",
  "objective": "Synchronize the team and identify blockers",
  "description": "Each day at the same time, the team meets so as to bring everyone up to date on the information that is vital for coordination: each team member briefly describes any 'completed' contributions and any obstacles that stand in their way. This meeting is normally timeboxed to a maximum duration of 15 minutes, though this may need adjusting for larger teams. To keep the meeting short, any topic that starts a discussion is cut short, added to a 'parking lot' list, and discussed in greater depth after the meeting, between the people affected by the issue.",
  "method": "Scrum",
  "tags": [
    "Visual/Tactile",
    "Async-Ready",
    "Structured"
  ],
  "practice_goal": [
    "Communication",
    "Transparency",
    "Self-Organization"
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

---

## Related Documentation

See also:
- [Project Overview](01-project-overview.md)
- [Architecture](03-architecture.md)
- [Development Guide](08-development-guide.md)
