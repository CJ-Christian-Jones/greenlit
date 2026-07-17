(function installV38DecisionLedger(root, factory) {
  const namespace = root.GreenlitV38 || (root.GreenlitV38 = {});
  const ledger = factory();
  namespace.ledger = ledger;
  if (typeof module !== "undefined" && module.exports) module.exports = ledger;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV38DecisionLedger() {
  "use strict";

  const DIMENSIONS = Object.freeze({
    spectacle: { label: "Spectacle", color: "#7dd3fc" },
    prestige: { label: "Prestige", color: "#c4b5fd" },
    faithfulness: { label: "Faithfulness", color: "#fcd34d" },
    experimentation: { label: "Experimentation", color: "#f0abfc" },
    starPower: { label: "Star power", color: "#fb7185" },
    discipline: { label: "Budget discipline", color: "#86efac" },
  });

  const SLOTS = Object.freeze([
    { id: "first-cut", chapter: "The First Cut" },
    { id: "rehearsal-week", chapter: "Performance" },
    { id: "final-sequence", chapter: "Final Sequence" },
  ]);

  const choice = (id, label, detail, consequence, deltas) =>
    Object.freeze({ id, label, detail, consequence, deltas: Object.freeze(deltas) });
  const scenario = (scenarioId, title, text, choices) =>
    Object.freeze({ scenarioId, title, text, choices: Object.freeze(choices) });

  const BACKLOGS = Object.freeze({
    "first-cut": Object.freeze([
      scenario(
        "runtime-overage",
        "The first cut runs twenty minutes long.",
        "The movie can protect its scale or find a tighter theatrical rhythm.",
        [
          choice("protect-scope", "Protect the scope", "Keep the large sequences and accept a more demanding cut.", "The finished film keeps its scale, but the package absorbs extra finishing pressure.", { spectacle: 3, discipline: -2, experimentation: 1 }),
          choice("cut-for-pace", "Cut for pace", "Remove a set piece and sharpen the theatrical rhythm.", "The release is cleaner and cheaper, though one signature sequence disappears.", { discipline: 3, spectacle: -1, prestige: 1 }),
        ],
      ),
      scenario(
        "opening-confusion",
        "The opening leaves test audiences one step behind.",
        "The cut can explain the world sooner or trust viewers to catch up.",
        [
          choice("add-prologue", "Add a short prologue", "Clarify the rules before the story accelerates.", "The movie becomes easier to enter, but its opening loses some mystery.", { faithfulness: 2, discipline: -1, experimentation: -1 }),
          choice("trust-audience", "Trust the audience", "Keep the cold open and let context arrive naturally.", "The opening remains distinctive and confident, with a higher risk of early confusion.", { experimentation: 3, prestige: 1, faithfulness: -1 }),
        ],
      ),
      scenario(
        "subplot-performance",
        "The best performance lives inside the slowest subplot.",
        "A standout actor moment is competing with the pace of the whole film.",
        [
          choice("keep-subplot", "Keep the full subplot", "Protect the performance and its emotional context.", "The actor gains a showcase while the middle of the film carries more weight.", { prestige: 3, starPower: 2, discipline: -3, spectacle: -1 }),
          choice("salvage-scene", "Keep one essential scene", "Trim the subplot but preserve its strongest beat.", "The cut moves faster and retains a trace of the performance instead of its full arc.", { discipline: 3, prestige: 1, starPower: -1, spectacle: 1 }),
        ],
      ),
      scenario(
        "late-antagonist",
        "The antagonist does not fully arrive until the second half.",
        "Editorial can reveal the threat earlier or let absence create unease.",
        [
          choice("restructure-reveal", "Move the reveal forward", "Reorder scenes so the conflict becomes clear sooner.", "The film gains momentum and a clearer hook, but sacrifices some slow-burn tension.", { spectacle: 2, discipline: 1, experimentation: -1 }),
          choice("preserve-mystery", "Preserve the mystery", "Let the antagonist remain an unseen pressure.", "The film keeps its unusual shape and asks the audience for patience.", { prestige: 2, experimentation: 2, starPower: -1 }),
        ],
      ),
      scenario(
        "exposition-request",
        "The studio wants a voice-over to explain the central reveal.",
        "Clarity is available, but it may flatten the visual storytelling.",
        [
          choice("record-voiceover", "Record the voice-over", "Give the audience a direct explanation at the reveal.", "The plot lands cleanly, though the movie states what the images already imply.", { faithfulness: 2, discipline: 1, experimentation: -2 }),
          choice("protect-visuals", "Protect the visual reveal", "Refine the edit and communicate without narration.", "The sequence stays cinematic and rewards attention, with some confusion left in play.", { prestige: 3, experimentation: 2, discipline: -1 }),
        ],
      ),
      scenario(
        "unfinished-vfx",
        "A major effects sequence is not convincing yet.",
        "The team can simplify the idea or spend its remaining finishing reserve.",
        [
          choice("simplify-effect", "Redesign it around practical elements", "Reduce the digital scope and emphasize physical detail.", "The sequence becomes smaller but more tactile and controlled.", { discipline: 3, prestige: 1, spectacle: -2 }),
          choice("finish-vfx", "Fund the final effects push", "Keep the concept and authorize an intensive finishing pass.", "The promised image survives, while post-production loses its safety margin.", { spectacle: 3, experimentation: 1, discipline: -3 }),
        ],
      ),
      scenario(
        "tonal-comedy",
        "A comic beat gets the biggest laugh and breaks the tension.",
        "The moment humanizes the cast but changes the temperature of the scene.",
        [
          choice("keep-laugh", "Keep the laugh", "Let the audience breathe and protect the actor's timing.", "The cast becomes more likable, though the sequence releases pressure early.", { starPower: 2, experimentation: 1, prestige: -1 }),
          choice("hold-tension", "Hold the tension", "Remove the joke and maintain the scene's escalation.", "The film becomes more tonally disciplined and less playful.", { prestige: 2, discipline: 1, starPower: -1 }),
        ],
      ),
      scenario(
        "flashback-reveal",
        "A flashback explains a reveal the present-day story already suggests.",
        "The cut can confirm the answer or preserve room for interpretation.",
        [
          choice("keep-flashback", "Keep the flashback", "Make the character history explicit and emotional.", "The reveal gains clarity and performance detail, but repeats information.", { faithfulness: 2, prestige: 1, discipline: -1 }),
          choice("cut-flashback", "Let the audience connect it", "Remove the flashback and trust the surrounding performances.", "The film becomes leaner and more open-ended.", { experimentation: 2, discipline: 2, faithfulness: -1 }),
        ],
      ),
      scenario(
        "two-codas",
        "The movie ends, then ends again.",
        "One coda resolves the characters; the other completes the larger world.",
        [
          choice("keep-both-codas", "Keep both endings", "Give the characters and the world their full closure.", "The audience leaves with answers, but the final stretch lingers.", { faithfulness: 3, prestige: 1, discipline: -1 }),
          choice("end-on-character", "End on the character", "Remove the world-building coda and leave on emotion.", "The finish becomes sharper and more intimate, with sequel questions unanswered.", { prestige: 3, discipline: 1, spectacle: -1 }),
        ],
      ),
      scenario(
        "temp-track-rights",
        "The defining montage is cut to a song the production cannot clear.",
        "The sequence can be rebuilt for the score or the studio can chase the license.",
        [
          choice("rebuild-for-score", "Rebuild it for the score", "Let the composer reshape the montage around original music.", "The sequence becomes more unified with the film and less instantly familiar.", { prestige: 2, discipline: 2, starPower: -1 }),
          choice("license-track", "License the track", "Protect the current rhythm and its recognizable hook.", "The montage keeps its energy and marketing value at a premium cost.", { starPower: 3, spectacle: 1, discipline: -3 }),
        ],
      ),
    ]),
    "rehearsal-week": Object.freeze([
      scenario(
        "extra-rehearsal",
        "The leads ask for an additional rehearsal week.",
        "Performance depth competes directly with schedule certainty.",
        [
          choice("fund-rehearsals", "Fund the rehearsals", "Give the ensemble time to rebuild the relationships.", "The performances gain detail and chemistry while the schedule loses slack.", { prestige: 3, starPower: 1, discipline: -2 }),
          choice("hold-schedule", "Hold the schedule", "Trust preparation and protect the production plan.", "The production remains controlled, but the cast has less room to discover surprises.", { discipline: 3, prestige: -1, faithfulness: 1 }),
        ],
      ),
      scenario(
        "improvised-dialogue",
        "The lead wants to improvise the film's most quoted scene.",
        "The script's precision is competing with the performer's instincts.",
        [
          choice("open-the-take", "Open up the take", "Shoot several improvised versions after the scripted pass.", "The star finds fresh moments, while editorial inherits more tonal variation.", { starPower: 3, experimentation: 2, discipline: -1 }),
          choice("protect-script", "Protect the script", "Keep the scene on its written rhythm and language.", "The story remains precise and faithful, with less room for a breakout surprise.", { faithfulness: 3, discipline: 1, starPower: -1 }),
        ],
      ),
      scenario(
        "supporting-breakout",
        "A supporting performer is stealing every scene.",
        "The production can expand the role or protect the lead's center of gravity.",
        [
          choice("expand-support", "Expand the supporting role", "Add coverage and a new connective scene.", "The ensemble gains a breakout presence, but the lead shares more of the movie.", { starPower: 2, prestige: 2, discipline: -1 }),
          choice("protect-lead", "Protect the lead", "Keep the planned balance and resist rewriting around dailies.", "The film holds its intended point of view and leaves some electricity unused.", { faithfulness: 2, discipline: 2, starPower: -1 }),
        ],
      ),
      scenario(
        "weak-chemistry",
        "The leads are strong separately and distant together.",
        "The schedule has room for either relationship work or additional coverage.",
        [
          choice("relationship-work", "Rehearse the relationship", "Use the remaining time on shared history and physical behavior.", "The partnership becomes more credible, with fewer technical options in the edit.", { prestige: 3, starPower: 1, discipline: -2 }),
          choice("shoot-coverage", "Shoot protective coverage", "Give editorial alternate reactions and cleaner scene construction.", "The cut becomes safer and more flexible without fully solving the chemistry.", { discipline: 3, prestige: -1, faithfulness: 1 }),
        ],
      ),
      scenario(
        "character-accent",
        "A performer arrives with a bold accent no one expected.",
        "The choice is memorable, but it may pull focus from the character.",
        [
          choice("commit-accent", "Commit to the accent", "Build the performance around the actor's specific choice.", "The role gains an unmistakable identity and a higher risk of distraction.", { experimentation: 3, starPower: 2, prestige: -1 }),
          choice("dial-it-back", "Dial it back", "Favor clarity and keep the performance inside the ensemble's world.", "The character integrates smoothly but loses a potentially iconic flourish.", { discipline: 2, faithfulness: 2, starPower: -1 }),
        ],
      ),
      scenario(
        "ensemble-tone",
        "Half the ensemble is playing realism; half is playing heightened genre.",
        "Direction can unify the performances or make the contrast part of the movie.",
        [
          choice("unify-tone", "Unify the tone", "Reset the company around one shared performance language.", "The film becomes coherent and controlled, though some eccentric energy disappears.", { prestige: 2, discipline: 2, experimentation: -1 }),
          choice("embrace-contrast", "Embrace the contrast", "Use the clash to define different corners of the story.", "The film gains a strange identity and accepts a more divisive tone.", { experimentation: 3, spectacle: 1, faithfulness: -1 }),
        ],
      ),
      scenario(
        "emotional-schedule",
        "The hardest emotional scene lands at the end of an exhausting day.",
        "The production can stop early or ask the cast to find it now.",
        [
          choice("move-the-scene", "Move the scene", "Protect the performance and rebuild tomorrow's schedule.", "The scene receives the focus it needs, while the production pays for the move.", { prestige: 3, starPower: 1, discipline: -2 }),
          choice("finish-the-day", "Finish the day", "Use the fatigue and keep the company on schedule.", "The production stays disciplined and captures a rawer, less controlled performance.", { discipline: 3, experimentation: 1, prestige: -1 }),
        ],
      ),
      scenario(
        "coverage-dispute",
        "The star wants the confrontation built around close-ups.",
        "The director planned the scene as an ensemble pressure cooker.",
        [
          choice("favor-closeups", "Give the star the close-ups", "Center the scene on the lead's emotional turns.", "The performance gains power and the ensemble loses some spatial tension.", { starPower: 3, prestige: 1, spectacle: -1 }),
          choice("hold-ensemble", "Hold the ensemble frame", "Keep every reaction alive inside the scene.", "The sequence feels authored and collective, with less conventional star emphasis.", { prestige: 3, experimentation: 1, starPower: -1 }),
        ],
      ),
      scenario(
        "practical-stunt",
        "The lead wants to perform the climactic stunt personally.",
        "Authenticity and star visibility are competing with schedule risk.",
        [
          choice("approve-stunt", "Approve the practical stunt", "Rehearse carefully and capture the actor in the action.", "The sequence gains credibility and publicity value, but one delay could be expensive.", { starPower: 3, spectacle: 2, discipline: -2 }),
          choice("use-stunt-team", "Use the stunt team", "Protect the schedule and design the coverage around specialists.", "The action remains safe and controlled with less visible star participation.", { discipline: 3, spectacle: 1, starPower: -1 }),
        ],
      ),
      scenario(
        "pickup-availability",
        "A key performer is unavailable for the final pickup day.",
        "The missing beat can be redesigned or the unit can wait for the actor.",
        [
          choice("redesign-pickup", "Redesign the pickup", "Use inserts, off-screen dialogue, and another character's point of view.", "The production solves the problem inventively and changes the scene's emphasis.", { discipline: 3, experimentation: 2, starPower: -1 }),
          choice("wait-for-actor", "Wait for the actor", "Move the unit and preserve the intended performance beat.", "The scene keeps its emotional design while the schedule absorbs a costly pause.", { prestige: 2, faithfulness: 2, discipline: -3 }),
        ],
      ),
    ]),
    "final-sequence": Object.freeze([
      scenario(
        "trailer-moment",
        "The ending works emotionally but lacks a trailer moment.",
        "The studio must choose between escalation and character clarity.",
        [
          choice("scale-it-up", "Scale it up", "Build one final image designed for theaters and trailers.", "The campaign gains an unmistakable hook at the cost of money and tonal restraint.", { spectacle: 3, experimentation: 1, discipline: -2 }),
          choice("protect-character", "Protect the character ending", "Keep the intimate resolution and sell confidence instead of noise.", "The ending stays coherent and actor-led, but marketing has fewer obvious money shots.", { prestige: 2, faithfulness: 2, spectacle: -1 }),
        ],
      ),
      scenario(
        "vfx-geography",
        "The visual-effects climax is spectacular and hard to follow.",
        "The final pass can add more impact or make the action legible.",
        [
          choice("clarify-action", "Clarify the geography", "Simplify shots and make every objective readable.", "The climax becomes tense and coherent, with fewer images competing for attention.", { discipline: 2, prestige: 2, spectacle: -1 }),
          choice("maximize-impact", "Maximize the impact", "Keep the density and push the sensory scale.", "The ending becomes an event-sized rush that may overwhelm narrative detail.", { spectacle: 4, experimentation: 1, discipline: -2 }),
        ],
      ),
      scenario(
        "villain-fate",
        "Test audiences disagree about the antagonist's final fate.",
        "A definitive answer offers closure; ambiguity leaves the story alive.",
        [
          choice("show-fate", "Show the final fate", "Give the confrontation a clear and irreversible ending.", "The audience receives closure and the mythology loses an open question.", { faithfulness: 2, spectacle: 1, experimentation: -1 }),
          choice("leave-ambiguous", "Leave it ambiguous", "End on a clue rather than an answer.", "The final beat becomes discussable and less conventionally satisfying.", { experimentation: 3, prestige: 1, faithfulness: -1 }),
        ],
      ),
      scenario(
        "final-line",
        "The final line explains the emotion the actors already landed.",
        "The movie can name the feeling or end in silence.",
        [
          choice("keep-final-line", "Keep the final line", "Give the audience a clear statement of resolution.", "The ending lands accessibly and loses a little interpretive space.", { faithfulness: 2, starPower: 1, experimentation: -1 }),
          choice("end-in-silence", "End in silence", "Let the final look carry the meaning.", "The finish becomes restrained, actor-led, and more open to interpretation.", { prestige: 3, experimentation: 1, starPower: 1 }),
        ],
      ),
      scenario(
        "score-overwhelm",
        "The final cue is powerful enough to overpower the performances.",
        "Music can lead the emotion or leave room for breath and dialogue.",
        [
          choice("lead-with-theme", "Lead with the theme", "Let the score turn the ending into a full emotional release.", "The finale becomes sweeping and memorable, with less intimacy in the performances.", { spectacle: 2, starPower: 1, prestige: -1 }),
          choice("strip-back-score", "Strip the score back", "Use silence and a restrained final statement.", "The actors remain at the center and the ending feels less immediately grand.", { prestige: 3, discipline: 1, spectacle: -1 }),
        ],
      ),
      scenario(
        "post-credit",
        "The studio proposes a post-credit scene for another film.",
        "The tag could expand the world or weaken the completed ending.",
        [
          choice("add-tag", "Add the post-credit tag", "Promise a larger future and give fans one more reveal.", "The release gains conversation and franchise energy at the cost of finality.", { spectacle: 2, starPower: 2, faithfulness: -1 }),
          choice("end-clean", "Let the movie end", "Protect the final image as the last word.", "The film stands on its own and leaves expansion to another day.", { prestige: 2, faithfulness: 2, discipline: 1 }),
        ],
      ),
      scenario(
        "long-epilogue",
        "The epilogue resolves every character and lasts fifteen minutes.",
        "Completion is competing with the energy of the climax.",
        [
          choice("keep-epilogue", "Give everyone closure", "Keep the full aftermath and every farewell.", "The ensemble receives a generous ending while the movie takes its time leaving.", { faithfulness: 3, prestige: 1, discipline: -1 }),
          choice("compress-epilogue", "Build one final montage", "Condense the aftermath into a focused visual passage.", "The movie exits with momentum and gives some characters less space.", { discipline: 2, spectacle: 1, faithfulness: -1 }),
        ],
      ),
      scenario(
        "alternate-ending",
        "The studio has financed a safer alternate ending.",
        "The production can test both versions or commit to its original thesis.",
        [
          choice("test-both", "Test both endings", "Let audience response choose the final version.", "The release gains useful evidence and risks sanding away its strongest point of view.", { discipline: 2, starPower: 1, experimentation: -2 }),
          choice("commit-original", "Commit to the original", "Finish the ending the production was built to deliver.", "The film keeps its identity and accepts the full risk of that choice.", { prestige: 2, experimentation: 2, discipline: -1 }),
        ],
      ),
      scenario(
        "climax-location",
        "Marketing wants the intimate climax moved to a larger location.",
        "Scale could create a stronger image, while the current room protects the performances.",
        [
          choice("move-outdoors", "Move it to the larger location", "Redesign the confrontation around scale and public consequence.", "The finale gains scope and campaign imagery while production complexity rises.", { spectacle: 4, starPower: 1, discipline: -3 }),
          choice("keep-room", "Keep it in the room", "Let faces, blocking, and dialogue carry the confrontation.", "The climax stays controlled and personal with less visual spectacle.", { prestige: 3, discipline: 2, spectacle: -2 }),
        ],
      ),
      scenario(
        "homage-shot",
        "The final shot directly echoes the original movie.",
        "The remake can close on recognition or claim an image of its own.",
        [
          choice("keep-homage", "Keep the homage", "Reward the audience with a precise visual rhyme.", "The ending gains emotional recognition and ties itself tightly to the source.", { faithfulness: 4, starPower: 1, experimentation: -1 }),
          choice("create-new-image", "Create a new final image", "End on a composition unique to this version.", "The remake declares its independence and gives up an easy nostalgic payoff.", { experimentation: 3, prestige: 2, faithfulness: -2 }),
        ],
      ),
    ]),
  });

  function hash(value) {
    let output = 2166136261;
    for (const character of String(value)) {
      output ^= character.charCodeAt(0);
      output = Math.imul(output, 16777619);
    }
    return output >>> 0;
  }

  function scenarioFor(slotId, scenarioId) {
    const backlog = BACKLOGS[slotId] || [];
    return backlog.find((entry) => entry.scenarioId === scenarioId) || backlog[0] || null;
  }

  function generatedScenarioIds(seed) {
    return Object.fromEntries(
      SLOTS.map((slot) => {
        const backlog = BACKLOGS[slot.id];
        const index = hash(`${seed}|${slot.id}`) % backlog.length;
        return [slot.id, backlog[index].scenarioId];
      }),
    );
  }

  function create(value = {}, seed = null) {
    const source = value && typeof value === "object" ? value : {};
    const hasLegacyChoices =
      !source.scenarioIds && Object.keys(source.choices || {}).length > 0;
    const resolvedSeed = String(source.seed || seed || "default");
    const generated =
      seed == null && !source.seed
        ? Object.fromEntries(SLOTS.map((slot) => [slot.id, BACKLOGS[slot.id][0].scenarioId]))
        : generatedScenarioIds(resolvedSeed);
    const scenarioIds = {};
    const choices = {};

    for (const slot of SLOTS) {
      const requested = hasLegacyChoices
        ? BACKLOGS[slot.id][0].scenarioId
        : source.scenarioIds?.[slot.id];
      const active = scenarioFor(slot.id, requested || generated[slot.id]);
      scenarioIds[slot.id] = active.scenarioId;
      const selectedId = source.choices?.[slot.id];
      if (active.choices.some((entry) => entry.id === selectedId)) {
        choices[slot.id] = selectedId;
      }
    }

    return { version: 2, seed: resolvedSeed, scenarioIds, choices };
  }

  function activeDilemmas(value) {
    const state = create(value, value?.seed || null);
    return SLOTS.map((slot) => ({
      ...slot,
      ...scenarioFor(slot.id, state.scenarioIds[slot.id]),
    }));
  }

  const DILEMMAS = Object.freeze(
    SLOTS.map((slot) => ({ ...slot, ...BACKLOGS[slot.id][0] })),
  );

  function activeDilemma(value, id) {
    return activeDilemmas(value).find((entry) => entry.id === id) || null;
  }

  function choose(value, dilemmaId, choiceId) {
    const output = create(value, value?.seed || null);
    const entry = activeDilemma(output, dilemmaId);
    const selected = entry?.choices.find((candidate) => candidate.id === choiceId);
    if (!entry || !selected) return output;
    output.choices[dilemmaId] = choiceId;
    return output;
  }

  function selectedChoice(value, dilemmaId) {
    const state = create(value, value?.seed || null);
    const entry = activeDilemma(state, dilemmaId);
    const selectedId = state.choices[dilemmaId];
    return entry?.choices.find((entryChoice) => entryChoice.id === selectedId) || null;
  }

  function contextDeltas(context = {}) {
    const output = {};
    const add = (key, amount) => {
      output[key] = (output[key] || 0) + amount;
    };
    if (context.direction === "Faithful") add("faithfulness", 2);
    if (context.direction === "Modern Reimagining") {
      add("faithfulness", 1);
      add("experimentation", 1);
    }
    if (context.direction === "Bold Reinvention") add("experimentation", 3);
    if (context.marketing === "Blockbuster Blitz") add("spectacle", 2);
    if (context.marketing === "Prestige Roadshow") add("prestige", 2);
    if (context.marketing === "Fan Mobilization") add("faithfulness", 2);
    if (context.marketing === "Viral Spark") add("experimentation", 2);
    if (Number(context.talentOverageM) > 0) add("discipline", -2);
    else if (Number.isFinite(Number(context.talentOverageM))) add("discipline", 1);
    return output;
  }

  function scores(value, context = {}) {
    const output = Object.fromEntries(Object.keys(DIMENSIONS).map((key) => [key, 0]));
    const apply = (deltas = {}) => {
      for (const [key, amount] of Object.entries(deltas)) {
        if (key in output) output[key] += Number(amount) || 0;
      }
    };
    apply(contextDeltas(context));
    for (const entry of activeDilemmas(value)) {
      apply(selectedChoice(value, entry.id)?.deltas);
    }
    return output;
  }

  function completed(value) {
    return activeDilemmas(value).filter((entry) => selectedChoice(value, entry.id)).length;
  }

  function isComplete(value) {
    return completed(value) === SLOTS.length;
  }

  function summary(value, context = {}) {
    const values = scores(value, context);
    const ranked = Object.entries(values).sort((first, second) => second[1] - first[1]);
    const strengths = ranked.filter(([, score]) => score > 0).slice(0, 2);
    const tensions = ranked.filter(([, score]) => score < 0).sort((a, b) => a[1] - b[1]).slice(0, 2);
    const thesis = strengths.length
      ? strengths.map(([key]) => DIMENSIONS[key].label.toLowerCase()).join(" and ")
      : "balanced execution";
    return { values, ranked, strengths, tensions, thesis };
  }

  function effects(value, context = {}) {
    const values = scores(value, context);
    // Three production calls should create tradeoffs, not act as a hidden stack
    // of free bonuses. These baselines center the complete 30-scenario backlog
    // around neutral while preserving each response's distinct shape.
    const baseline = {
      critic: 1.74,
      audience: 1.06,
      craft: 1.33,
      commercial: 0.69,
    };
    return {
      critic: Math.max(-4, Math.min(4, values.prestige * 0.55 + values.experimentation * 0.2 - baseline.critic)),
      audience: Math.max(-4, Math.min(4, values.spectacle * 0.38 + values.faithfulness * 0.35 + values.starPower * 0.2 - baseline.audience)),
      craft: Math.max(-4, Math.min(4, values.prestige * 0.35 + values.discipline * 0.22 + values.experimentation * 0.18 - baseline.craft)),
      commercial: Math.max(-3, Math.min(3, values.spectacle * 0.28 + values.starPower * 0.3 + values.discipline * 0.14 - baseline.commercial)),
    };
  }

  function choiceResults(value) {
    return activeDilemmas(value)
      .map((entry) => {
        const selected = selectedChoice(value, entry.id);
        return selected
          ? {
              dilemmaId: entry.id,
              scenarioId: entry.scenarioId,
              chapter: entry.chapter,
              prompt: entry.title,
              title: selected.label,
              consequence: selected.consequence,
              deltas: { ...selected.deltas },
            }
          : null;
      })
      .filter(Boolean);
  }

  return Object.freeze({
    DIMENSIONS,
    SLOTS,
    BACKLOGS,
    DILEMMAS,
    backlogSize: Object.values(BACKLOGS).reduce((sum, entries) => sum + entries.length, 0),
    create,
    activeDilemmas,
    choose,
    selectedChoice,
    scores,
    completed,
    isComplete,
    summary,
    effects,
    choiceResults,
  });
});
