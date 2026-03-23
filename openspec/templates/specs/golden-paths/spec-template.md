## ADDED Requirements

<!-- 
  GOLDEN PATH SPEC TEMPLATE
  
  This template serves two purposes:
  1. UAT test scenarios (verified by /opsx:verify)
  2. Source for demoTracks.ts generation (the build agent reads this to write demo guide)
  
  Each golden path requirement = one DemoTrack
  Each scenario within a path = one DemoScenario with pills, steps, talking points
  
  STRUCTURED METADATA FORMAT:
  - **Track:** metadata becomes DemoTrack properties
  - **Navigation:** becomes a demo pill ({ label, path, icon })
  - **Steps:** becomes steps[] in the demo track scenario
  - **Talking points:** becomes talkingPoints[] in the demo track scenario
  - **Expected outcome:** stays in spec only — used for UAT verification, NOT in demoTracks
  
  Fill in {placeholders} during the coaching/proposal phase.
-->

### Requirement: Golden Path 1 - {journey_name}
The demo SHALL support a complete {journey_description} without errors.

**Track:**
- title: "{track_title}"
- description: "{track_description}"
- valueProposition: "{why_this_journey_matters_to_audience}"

#### Scenario: {step_1_title}
**Navigation:** path={route_1}, label="{pill_label_1}", icon={icon_1}

**Steps:**
1. {what_to_do_1}
2. {what_to_do_2}
3. {what_to_do_3}

**Talking points:**
- "{what_to_say_about_this_step}"
- "{key_insight_for_audience}"

**Expected outcome:**
- **THEN** {testable_condition_1}
- **THEN** {testable_condition_2}

#### Scenario: {step_2_title}
**Navigation:** path={route_2}, label="{pill_label_2}", icon={icon_2}

**Steps:**
1. {what_to_do_1}
2. {what_to_do_2}

**Talking points:**
- "{what_to_say_about_this_step}"

**Expected outcome:**
- **THEN** {testable_condition_1}
- **THEN** {testable_condition_2}

#### Scenario: Fail conditions absent
- **WHEN** executing the full golden path
- **THEN** none of these occur: {fail_condition_1}, {fail_condition_2}, {fail_condition_3}

---

<!-- Add Golden Path 2, 3 etc. as needed. Most demos have 1-3 golden paths. -->

### Requirement: Golden Path 2 - {journey_name_2}
The demo SHALL support a complete {journey_description_2} without errors.

**Track:**
- title: "{track_title_2}"
- description: "{track_description_2}"
- valueProposition: "{why_this_journey_matters_2}"

#### Scenario: {step_1_title}
**Navigation:** path={route}, label="{pill_label}", icon={icon}

**Steps:**
1. {what_to_do}

**Talking points:**
- "{what_to_say}"

**Expected outcome:**
- **THEN** {testable_condition}
