// Word lists for the username generator. Written fresh for this tool (original, not copied from any other
// site or generator). Everything is lowercase letters a-z only; the generator handles capitals.
// Each category has three lists:
//   first  - word starts and stems
//   second - word endings and tails
//   solo   - complete short names that stand alone
// Content rules: adult/teen-neutral, no slurs, no sexual, hateful or extremist terms, no real brands or
// characters. tests/words.test.mjs checks the shape of every list and scans every combination.

const w = (s) => s.trim().split(/\s+/);

export const CATEGORY_IDS = ['fantasy', 'scifi', 'cute', 'edgy', 'gamer', 'mix'];

export const CATEGORY_LABELS = {
  fantasy: 'fantasy', scifi: 'sci-fi', cute: 'cute', edgy: 'edgy', gamer: 'gamer tag', mix: 'mixed-style',
};

export const WORDS = {
  fantasy: {
    first: w(`ael ash aur bram briar cael cinder cor dawn dusk eld elm ember faer fen fern flint frost gale glim grey
      hale hawk heath hollow iron ivy jade kest kyr lark leaf lor lun mist mor moss myr nar night oak oren pine quill rain
      rill rook rowan rune sable sage sil silver sky sol star storm sun tal thistle thorn tir umber vale vel wild willow
      wind wren wyrm yar zeph amber bright cold dell elder fable gild glade grove hazel`),
    second: w(`ara bourne brook crest dale dor eth fall field fire ford gard glen helm hollow iel ion kin lan leaf light
      lin lith mere mir moor nor ora rend ridge shade shire song spire stead stone thorn tide vale var veil ven vyn ward
      whisper wick wind wing wood wyn yth zar bloom crown dawn flame haven heart reach rise`),
    solo: w(`aldric alwen arwyn belmoor brynn caelum calith corwin dainra eldric elowen emberlyn faelin fenwick galwyn
      halvard isolde jorwen kaelith lorien lysander maelis marrow merrin morwen nimue oriel orwyn perrin quillon rhosyn
      rowena selwyn sendal sorrel talwyn tamsin tavish thessaly tivor ulwen valen velora wendel wynne yelena yseult
      zephyrine aelwyn bronwen cedric dunmere eirian elmswick fiora glenna hartwin ildara jessamy kestrel leofric
      mirelock oakhollow ravenmoor sylvaran thornwyn wyrmgard duskmere elvaris faelith lunebrook ashveil`),
  },
  scifi: {
    first: w(`astro axion byte cipher comet cosmo cryo cyber delta drift flux forge gamma helix hyper ion kilo
      kinetic laser lumen lunar macro mega meta micro nano neo neon nexus nova omega onyx photon pixel plasma polar
      pulse quantum radar rogue solar spectra static stellar sync tera terra titan turbo ultra vector vertex void volt
      warp xeno zero zenith zeta proton quasar vortex arc atlas binary circuit cobalt dyna gravity infra`),
    second: w(`bot byte cell core craft drive drone field flare forge gate grid hawk jet lab lance link node orbit pilot
      port prime pulse rider runner shift ship signal spark star storm strike tech wave wing works zone array beam
      blade cloud code engine frame fusion gear lock loop mind rail ray relay sector shard
      skiff slate spire tower track vault wake yard`),
    solo: w(`aerion astrix callisto cygnus deneb eridan galax halcyon hydrix kryon lyra nebula novae pulsar quasar rigel
      sirius tauri vega voidrunner zentrix xylon ariel altair andromeda bellatrix capella cosmix draconis europa
      fornax gliese hyperion indus juno kepleron lacerta mirach nashira octans pavo phobos puppis rasalas saiph
      talitha tycho umbra vesta wezen zosma cryon dyneth axiom helion kosmo lumex nexor orbix
      trion valkyr xenon zirconia ioncell polaris`),
  },
  cute: {
    first: w(`bubble berry biscuit bloom bun button buttercup cherry clover cocoa cookie cosy cotton cuddle daisy dew
      dizzy dumpling fluffy fuzzy giggle ginger honey jelly jolly lemon lily mellow mochi muffin noodle nutmeg pancake
      peach peanut pebble pepper petal pip plum poppy pudding puffy sleepy snuggle sparkle sprout sugar sunny
      sweet tiny toasty toffee waffle whisker wiggle wobble apricot maple mango cinnamon daffodil teacup`),
    second: w(`bean bear bee bird bloom bun bug buddy button cake cloud cub cricket doodle drop fern fluff fox frog gem
      hop joy kit leaf lamb moth mouse muffin nest nugget otter paw pie pop puff pup snack snail star sprout toast
      tuft wick wing wisp wren bell berry biscuit blossom dot dream puddle
      pocket sock swirl teacup twig tulip whistle yarn`),
    solo: w(`mochibean dewdrop pebblewick honeyfern buttercake cloudberry daisybell fernwick jellybean lemondrop
      marshmallow nutmegg peachpie petalpuff pipsqueak pondlily poppyseed puddingpop sunnybun toffeebun twinkle
      waffles whiskerwick bumblepip cocoapuff crumpet dandelion dumpling fidget freckle gumdrop hazelnut
      honeydew kettlecorn lollipop marzipan meadow moonpie oatcake pipkin snowdrop sugarplum tinsel trinket
      acornpie bobbin cuddlebug fiddle gingersnap hopscotch jamjar marbles pinwheel sprinkle tumble velvet`),
  },
  edgy: {
    first: w(`ash bane black blade blaze bleak cinder crimson dark dread dusk ebon eclipse ember fang fell gloom grim hex
      hollow iron jinx mourn murk night noir obsidian onyx pale phantom raven rogue ruin scar shade shadow shard sorrow
      spite storm thorn venom vex viper void wraith wrath vile havoc cursed haunt rage steel frostbitten
      silent lunar ghost grave`),
    second: w(`bane bite blade brand byte claw cry curse edge fall fang fire flame fury gaze ghost hex howl knight mark
      moon rend reign rift scythe shard shroud snare soul spike storm strike talon thorn veil venom vow wake whisper
      wolf wraith wrath born fade hunter lord
      anchor ashes bind chain crow dagger hollow night raven reaver rune shade sigil thrall`),
    solo: w(`grimshard hexfall nightrend ravenbyte ashfang blackthorn bloodmoon cinderfall darkvale duskblade
      emberfall ghostveil gloomfang hollowmark ironhex jinxwolf murkvale noirbyte nightfang onyxblade palefall
      raventhorn ruinwake scarfall shadowmere shardwolf stormveil venomtail vexwraith voidfang wraithmoor
      umbrafang crowmoon ironveil blightfang cinderhex mournwolf dreadhollow ebonveil fenwraith hexblade ravenscar gravewalker nocturne silhouette
      eclipse spectre phantasm banshee nightshade wolfsbane`),
  },
  gamer: {
    first: w(`alpha blitz bolt boost bravo clutch combo crit dash delta drift flash ghost glitch hyper jolt lag loot
      maverick nitro nova ninja omega pixel pro quick rapid razor rogue sniper spawn speedy sprint stealth swift
      tactic turbo ultra viper volt vortex warp zero zap rush ranger rocket rift arc blaze cobra comet frost
      hawk iron laser lucky magic mono neon`),
    second: w(`ace aim arrow bolt boss bot buff byte camper chief clutch dash drop fox force hawk hunter jack king
      knight lord master ninja pilot pro ranger raven rider rush scout shot spark squad sync tank wolf wizard zone
      aimer blitz bomber cannon champ combo crew driver fury gunner hero legend strike
      mod noob pixel rank rig sprint stack streak tag turbo`),
    solo: w(`frostbite snipevolt phantomrx krakenrx nitrofox pixelpro blitzfox glitchhawk turbowolf voltace
      zerocool rapidfire flashbang clutchking stealthfox ghostrider ninjabyte sprintace razorclaw hyperdash
      speedrun wildcard headstart quickscope lootgoblin hotshot highscore bossfight checkpoint
      respawn cooldown overclock lagspike pingking fastlane gamepad joystick turbofox warpdrive
      coinrush bonuslevel comboking critlord
      pixelghost rocketfox nightowl ironwolf voltwing arcadeace fragment sidequest speedster turbonova`),
  },
};
