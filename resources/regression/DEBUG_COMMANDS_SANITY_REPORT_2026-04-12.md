# Debug Commands Sanity Report (Day53)

Date: 2026-04-12
Scope: Iteration 6 debug command sanity evidence

## HDL: Debug Current Project Classification
- Command ID: hdl-helper.debugProjectClassification
- Contributed: yes
- Registered in extension: yes
- Test evidence token: yes (buildClassificationDebugSections)
- Status: passed

## HDL: Debug Active Target Context
- Command ID: hdl-helper.debugActiveTargetContext
- Contributed: yes
- Registered in extension: yes
- Test evidence token: yes (Active target context debug snapshot reports invalid activeTarget fallback)
- Status: passed

## HDL: Debug Recent Runs By Target
- Command ID: hdl-helper.debugRecentRunsByTarget
- Contributed: yes
- Registered in extension: yes
- Test evidence token: yes (formatRunRecords()
- Status: passed

## HDL: Debug Toolchain Health By Profile
- Command ID: hdl-helper.debugToolchainHealthByProfile
- Contributed: yes
- Registered in extension: yes
- Test evidence token: yes (buildToolchainStatusForProfile)
- Status: passed

## Summary
- Overall: passed
- Result: all debug commands are contributed, registered, and covered by test evidence tokens.
