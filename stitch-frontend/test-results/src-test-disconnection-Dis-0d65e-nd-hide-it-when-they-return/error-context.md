# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test-disconnection.spec.ts >> Disconnection Notifications >> should show disconnection overlay when opponent leaves and hide it when they return
- Location: src/test-disconnection.spec.ts:6:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e6]: "MISSION: NEON_PHANTOM"
    - generic [ref=e7]:
      - generic [ref=e8]: "STATUS: ACTIVE"
      - button "fullscreen" [ref=e9] [cursor=pointer]:
        - generic [ref=e10]: fullscreen
      - button "volume_up" [ref=e11] [cursor=pointer]:
        - generic [ref=e12]: volume_up
      - button "help_outline" [ref=e13] [cursor=pointer]:
        - generic [ref=e14]: help_outline
  - main [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - heading "AUTHORIZATION TERMINAL" [level=1] [ref=e18]
        - paragraph [ref=e21]: Initializing secure uplink... Sector 07-B active
      - generic [ref=e22]:
        - generic [ref=e24]:
          - generic [ref=e25]: AGENT CODENAME
          - textbox "ENTER CRYPTONYM..." [active] [ref=e27]: Alpha
        - generic [ref=e28]:
          - button "GENERATE" [ref=e29] [cursor=pointer]
          - button "DEPLOY ASSET" [ref=e30] [cursor=pointer]
      - paragraph [ref=e32]: Enter your agent codename or select GENERATE for a random assignment.
  - contentinfo [ref=e33]:
    - generic [ref=e34]:
      - generic [ref=e35]:
        - paragraph [ref=e36]: Sector
        - generic [ref=e37]: 07-B
      - generic [ref=e38]:
        - paragraph [ref=e39]: Threat Level
        - generic [ref=e40]: Normal
      - generic [ref=e41]:
        - paragraph [ref=e42]: Coordinates
        - generic [ref=e43]: 38.9072° N / 77.0369° W
```