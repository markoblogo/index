# ABVX ecosystem contracts

Index Platform remains independently deployable. Companion projects exchange explicit, reviewable artifacts and do not inherit production authority.

| Project | Owns | Index relationship |
| --- | --- | --- |
| [ABVX-OS](https://github.com/markoblogo/ABVX-OS) | Portfolio control, bounded evidence, role and approval policy | May consume approved Index evidence; it does not calculate or publish index values |
| [ID 0.5.2](https://github.com/markoblogo/ID) | Policy-filtered human preferences | Optional operator context only; never respondent or market data |
| [agentsgen 0.5.1](https://github.com/markoblogo/AGENTS.md_generator) | Repository agent context | Generates and checks the committed context pack from `.agentsgen.json` |
| [SET 0.5.0](https://github.com/markoblogo/SET) | Review-first workflow plans | Exports a `web-ui` proposal from `.set.json`; it does not apply or deploy it |
| [ABVX Agent Skills](https://github.com/markoblogo/abvx-agent-skills) | Reusable work disciplines | Supplies optional review, verification, role, and context-control methods |
| [Git Tweet](https://github.com/markoblogo/git-tweet) | Release-to-social workflow | May observe public releases; it receives no private data or publication rights |

Index retains ownership of tenant resolution, respondent intake, calculation, public snapshots, Context reports, site publication, and channel delivery. No companion context, plan, role, or generated document can authorize `publish-site` or `send-channel`.
