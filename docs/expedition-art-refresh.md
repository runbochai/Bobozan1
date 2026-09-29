# Expedition teaching and pixel art refresh

The first three battles now teach a reproducible sequence. Guidance advances only after a legal move resolves; informational steps need acknowledgement. Skipping persists for the current expedition, and a new run starts with guidance enabled.

| Stage | Player practice | Opponent |
| --- | --- | --- |
| Dummy | Charge → Blast | Charge → Charge |
| Coward | Read intent → Charge → Defend → Blast | Charge → Blast → Charge |
| Turtle | Read intent → Charge → Charge → Ka | Defend throughout |

The Turtle lesson highlights the specific 3-energy base skill Ka; it does not imply every ultimate has the same cost. Tutorial intent bubbles name the actual card. Expedition uses a stable local player identity, so delayed or failed Firebase sign-in does not hide the local hand. Outside active practice, existing AI and intent rules apply.

Art direction: original `boy.png`, `bdrag.png`, and `pega.png` avatars. Enemy portraits use large friendly faces, dark stepped outlines and cyan badges. Ultimate characters use transparent action silhouettes without badges. Assets are generated individually with reference images using imagegen, then packaged as WebP with nearest-neighbor scaling. The original player avatars are unchanged.

Unlocked character art is preloaded during battle to reduce blank first-use entrances.

Cut-ins still apply only to level ultimates, not Ka/Ji or combination skills. One shared dim layer and impact sound avoid compounding effects when several players cast together. Characters, titles and speech bubbles occupy separate viewport cells. Mobile speech wraps, flashes are softer, and the reduced-motion setting remains supported. Meteor, ice blade, claw, steam, beam, star and wave effects use stepped animation and hard pixel shapes.

Validation: automated combat tests exercise all three lessons from zero energy, including affordability, survival and victory. Existing combat, room, configuration, audio and ultimate eligibility tests remain in the test suite. Production build and ESLint are checked. Browser screenshot validation was unavailable because the browser binary download failed; check single and simultaneous cut-ins on phone and desktop before publishing.

The five alternate Pegasus designs are preserved in `public/avatars/alternates/` and included in the avatar picker with localized names. Ultimate replacements use distinct species: raccoon swordsman, rabbit fighter, owl strategist, panda palm master and celestial dragon. Two friendly boss portraits are also preserved as selectable avatars; battle bosses use their threatening forms. Nested WebP avatar URLs normalize correctly across deployment bases.

Cut-ins display the skill’s actual level. Triple Slash and Triple Kick each show three hits; Five Slaps shows five palm strikes; Three-Star Dragon shows three stars.
