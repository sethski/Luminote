# Router knobs

Edit this file to tune routing. The always-on rule reads values from here — no hardcoded thresholds in the MDC.

| Setting | Value | Options |
|---------|-------|---------|
| **Default** | `auto` | `auto` · `poteto` · `ponytail` · `both` |
| **Short prompt (words)** | `100` | At or under → lean ponytail when complexity is low |
| **Long prompt (words)** | `200` | At or over → lean poteto when complexity is high |
| **QA gate** | `on` | `on` · `off` |
| **Gate once per thread** | `on` | `on` · `off` |

Count words in the **user's latest message only**. Attachments and `@`-files add complexity weight, not word count.

**Forced default** (not `auto`) skips classification and gate.

**Overrides in prompt** (win over everything): `quick` · `ponytail only` · `just fix it` · `poteto` · `full process` · `both` · `full stack` · `auto`
