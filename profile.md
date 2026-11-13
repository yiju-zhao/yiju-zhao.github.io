# Yiju Zhao (Eason Zhao)

I work on agents that learn from environment feedback. My work spans LLM post-training, agentic RL, and training-free self-evolution. I also build tools I use every day.

Location: Toronto, Canada

Email: eason.zhao.work@outlook.com
LinkedIn: https://linkedin.com/in/eason-zhao
GitHub: https://github.com/yiju-zhao
Portfolio: https://yiju-zhao.github.io/
Updated: 2026-11-13

## Experience

### Huawei · Toronto | Research Engineer

Sep 2024 – present

LLM post-training and agentic RL for code generation; training-free agent self-evolution, with evaluation and reward infrastructure.

### University of Waterloo | Research Assistant

Sep 2018 – May 2024

Scientific machine learning for quantum materials, including band-structure prediction and physics-informed neural networks.

## Education

- PhD, Electrical & Computer Engineering · Waterloo, 2024
- MASc, Electrical & Computer Engineering · Waterloo, 2018
- BSc, Physics · Shanghai Jiao Tong University, 2016

## Research and product interests

### Recursive self-improvement (RSI)

How far can an agent improve its prompts, tools and workflows while keeping the model fixed? I contribute to Open Evo and work on training-free self-evolution for a Triton kernel-generation agent. Evaluation is ongoing.

- [Open Evo · main contributor](https://github.com/CARI-DAAL/open-evo)
- [rsi-quant](https://yiju-zhao.github.io/#rsi-quant)

### RL & LLM post-training

I work across SFT, agentic RL (GRPO/PPO), distillation and reward design for code-generation agents. I’m interested in how environment feedback becomes useful training signal, and how to test whether it generalizes.



### Agentic systems & evaluation

Tool use, memory, held-out evaluation and human review are recurring problems in my work. I build the workflows and checks around agents so their output can be tested and traced.

- [herdr-pm](https://yiju-zhao.github.io/#agent-pm)
- [Noteweaver](https://yiju-zhao.github.io/#noteweaver)

### Products for knowledge work

I’m a co-founder and technical lead at OneSent, building document workflows from upload and extraction to human review. Knowledge management and language learning are other areas I build for.

- [Noteweaver](https://yiju-zhao.github.io/#noteweaver)
- [openlingo](https://yiju-zhao.github.io/#openlingo)

## Selected projects

### herdr-pm

A project board for Claude Code and Codex sessions running across multiple machines.

Status: Personal use. Technologies: TypeScript, SQLite, MCP.

Each machine reads its local sessions and pushes updates to a central SQLite service. The service exposes a web interface and MCP tools. Collectors advance their cursors after acknowledgement so interrupted transfers can resume.

- https://github.com/yiju-zhao/herdr-pm
- https://yiju-zhao.github.io/#agent-pm

### Noteweaver

A knowledge bank in Obsidian where claims keep their sources and agents follow the same rules as daily editing.

Status: Open source. Technologies: TypeScript, Obsidian, Node.js.

The Obsidian plugin handles daily editing. The Agent plugin provides skills for queries, writing and research. Each vault defines its own schema and policies. Structure checks and factual verification are separate operations.

- https://github.com/yiju-zhao/noteweaver
- https://yiju-zhao.github.io/#noteweaver

### Herdeo

Use the native terminal at your desk, then continue the same agent session from your phone.

Status: Open source. Technologies: Node.js, Herdr, Paseo.

Codex, Claude Code and Pi each use their own connection mechanism. The bridge connects to the native process already running in the terminal. Remote input currently supports plain text; advanced CLI operations stay in the terminal.

- https://github.com/yiju-zhao/Herdeo
- https://yiju-zhao.github.io/#herdeo

## Role interests

- Research engineering / LLM post-training: https://yiju-zhao.github.io/#background, https://yiju-zhao.github.io/#interests
- Agent infrastructure & evaluation: https://yiju-zhao.github.io/#agent-pm, https://yiju-zhao.github.io/#interests
- Agent products: https://yiju-zhao.github.io/#noteweaver, https://yiju-zhao.github.io/#interests

## Scope and status

- RSI is an ongoing research direction.
- Current Open Evo evaluation is ongoing.
- rsi-quant is strategy research using paper portfolios; verified investment performance has not been published.
- The cangjie-skill contribution is a fork with added controlled evaluation.
