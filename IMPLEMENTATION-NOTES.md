# Implementation Notes

Below are some cleaned-up notes that I typed up / dictated whilst working on the exercises. Whilst **not exhaustive**, by including these in the repo I hope to give better insight into my decision making process.

## Pre-setup

The first trade-off was having to spend the first 30 minutes setting up pre-commit and testing infrastructure, short-term pain, long-term gain. Day to day having guardrails like this to help "mold" the agent into shape are what I do. They may have taken away from development time. But it's important that what comes out is quality, not quantity in my opinion. I would rather build something robust and functional that I am confident works, so I could trust what the agent produced.

- Linting ensures the project writes idiomatic code - followed the nextjs recommended ruleset.
- Formatting keeps code clean between developers.
- Tests (unit & integration) validate behaviour for both humans and agents.
- Type checking ensures TypeScript is being used correctly.

Instead of designing generic components with hand-rolled tailwind classes. I wanted to integrate with the Forsyte branding. This took some time to setup, including having to get the css working with manual source imports from the node_modules, but I think it results in the UI being much higher quality.

## Frontend Design & Implementation

I took a "longer" approach here and decided to build an interface based approach, where a mock client or real http client can be instantiated. This did slow down the development of the frontend task, but it meant when it came to "slotting in" the real http implementation that communicates with the nest.js implementation was effortless.

In terms of the UI, I asked my agent to explore the product-ui repository after making a local clone so I could then create a useful CLAUDE.md to guide the agent when developing the frontend. The more consistent the UI experience, the more enjoyable the product experience. I settled on a three row approach, a fixed header, a scrollable chat view, and an anchored chat box. The solution is fully responsive; however by adopting this approach there is additional design overhead for later stages. This comes back to my core philosophy of strong foundations.

I wanted it to feel "real". I decided to invest in loading/thinking and error states so that the solution is ready to ship, rather than just a mockup. Additionally I added features that I myself as a user would find value in, such as a "scroll to bottom" button to appear when the user has scrolled up the chat history, allowing them to easily return to the most recent message.

## Login Implementation

For simplicity, I didn't implement HttpOnly cookies which would be "preferable" in an app like this to stop the access token being stolen through XSS. Instead the access token is held in memory and mirrored into session storage, so the user doesn't have to re-login on a page-reload.

I implemented a login page using the Forsyte product-ui. Form validation uses browser primitives, however, in a production system, with more development time I would have used react-hook-form to validate the form's state.

## Product Decisions

I elected to only allow the user to send one message at a time, disabling sending while waiting for a reply, rather than letting the user queue messages. Additionally, the backend would need changes to support queuing behaviour as the current message counts are not within a transaction, so two messages sent briefly after one another MIGHT result in the same sequenceId. The hook orders messages by `sequenceId`, not `createdAt`, so duplicate sequenceIDs could put messages in the wrong order.

I specifically chose to only disable the send button, rather than disabling the entire input, as personally I find this behaviour in other applications annoying.

I decided to focus more on product rather than making the implementation "cool" from a developer POV. There were lots of opportunities where I wanted to install cool libraries I like, such as RHF, Zod, Axios, but you can get most of these behaviours out of built in tools, and setting them up risked eating into development time, with little to no difference in experience to the customer/user.

## Architectural Decisions

As mentioned above, I invested in a client interface based approach so when it came to later tasks, swapping out to an HTTP implementation would be much simpler. This does add complexity to the code however and increases implementation time, at the benefit of long term flexibility

I elected to build a useAgentChat hook that composes several state fields, rather than opting to use a more complex reducer implementation. In theory I could have installed something like TanStack Query in exercise 2C (`useQuery` to fetch the session history, `useMutation` to send messages), but as discussed in Significant Issues, I struggled to progress here due to backend issues.

## Accessibility

By empowering the agent with chrome dev tools, I was able to reach an accessibility lighthouse score of 100.

## Security

Although Markdown is being sourced internally here, after a grilling session with my agent I considered that securing the MD implementation is worth the effort. This protects the solution against XSS through MD.

## Significant Issues

Exercise 2C requires fetching full session history, but the api does not have a history endpoint, with the current /messages POST endpoint only returning the last message. I believe fixing this would require backend changes which is forbidden by the exercise's brief. I was planning on sending an email to raise this as a blocker, and then continuing with a mock implementation facilitated by my interface-driven approach, allowing me to unblock myself. However I realised that I would be unable to complete this within the allocated four hours, so I decided to keep my focus on Stages A and B.

## Development Methodology

I used t3Code as my agent interface, with Opus 5.5 High Effort as the model.

I started by exploring the requirements, thinking of my general approach, defining specifics that I needed the agent to get right, creating a definition of done, and then using Matt Pocock's "grill me" skills to hash out aspects of the solution I have not considered.

I controlled the agent with the test, typing, linting, and formatting guardrails in the pre-commit hooks. I empowered the agent by giving it access to https://github.com/kunchenguid/chrome-devtools-axi - a wrapper of the chrome dev tools MCP, allowing the agent to validate its changes in chrome without me. However, the final sign off each exercise involved me manually exercising the UI changes.

The agent interface allowed me to easily test changes not supported by the backend, e.g. testing markdown rendering.

I gave the agent permission to use MSW to make testing easier.
