---
"thought-cabinet": patch
---

Strengthen TDD integration in creating-plan and implementing-plan skills

- Restructure plan-template change blocks to separate "Testable Behaviors (RED tests)" from "Reference Implementation", enforcing the rule that implementers read behaviors before code
- Add TDD compatibility checklist to creating-plan so plans are always written in a form that implementing-plan can consume test-first
- Update implementing-plan workflow to process one behavior bullet at a time (RED → GREEN → REFACTOR) and consult the reference implementation only after all bullets have passing tests
- Add concrete work-queue example showing how to map a change block to an ordered list of test cycles
