import Deckbuilder from 'deckbuilder';
// import settings, { surnames, firstNames } from './settings';
import { defaults } from './settings';
import { surnames, firstNames } from './names';
import { cardSet } from './card-definitions';

// class Candidate

// id
// name

// consequences / perception / public:
//   recognition   0 - 100   % of all voters
//   favorability  + / -     ratio of all voters
//   enthusiasm    ???   "hold nose" <----> "cult"
// ==> turnout

// factors pushing public sentiment:
// [usually have a cost or at least requirements]
//   media coverage
//   events / appearances
//   endorsements

// ???
// polling data / surveys
// connections

// enablers / enhancers / means
//   advisors and staff
//   contractors (e.g. ads)
//   surrogates
//   volunteers
//   party support
//   funding

const Game = function () {
  this.state = {
    // candidates: [],
    candidatesById: {},
      // candidates: {
      //   sequence: ["x","y"],
      //   currentNumber: 0, // "x"
      //   currentId: "x",
      //   byId: {
      //     "x": { ... },
      //     "y": { ... }
      //   }
      // }
    turnOrder: [], // by id of candidate
    // turn: null // deprecated
    turnNumber: 0, // pointer to element of turnOrder
      // polling is a derived value
      // internal demographic stats that determine poll numbers:
      // - recognition / awareness
      // - likeability / favorability
      // - alignment / favorability
      // - winnable / capable / realistic
      // media subtypes: earned, paid, owned, relational/social
    // game status: not ready (setting up, waiting for players) -> in progress -> concluded || error
    winner: null // double-duty indicator of if game has concluded
  };
};

Game.prototype = {
  setup: function() {
    this.settings = defaults;
    this.state.round = defaults.ROUNDS_PER_GAME // counts down to 0, representing weeks until election day
    this.deck = new Deckbuilder();
    this.prepareCards(this.deck);
    this.state.candidatesById = this.generateCandidates();
    this.state.turnOrder = Object.keys(this.state.candidatesById);
    const hands = this.deck.deal(this.settings.NUMBER_OF_CANDIDATES,this.settings.INITIAL_CARDS);
    for (let i=0; i < this.settings.NUMBER_OF_CANDIDATES; i++) {
      this.state.candidatesById[i].hand = hands[(i+1).toString()];
    }

    var initialState = this.state;

    return new Promise( function(resolve, reject) {

      if (!initialState) {
        reject("Problem with game setup");
      }
      resolve(initialState);

    })

  },

  generateCandidates: function() {
    const result = {};
    for (let i = 0; i < this.settings.NUMBER_OF_CANDIDATES; i++) {
      var generated = {
          id: i.toString(),
          name: this.generateName(),
          resources: {
            funding: this.settings.INITIAL_FUNDS,
            staff: this.settings.INITIAL_STAFF,
            volunteers: this.settings.INITIAL_VOLUNTEERS
          },
          stats: {
            polling: this.settings.INITIAL_POLLING,
            enthusiasm: 0,
            media: 0,
            endorsements: 0,
            events: 0
          }, 
          characteristics: {}, 
      };
      result[generated.id] = generated;
    }
    return result;
  },

  generateName: function() {
    return [firstNames, surnames].map(list => {
      let id = Math.floor(Math.random()*list.length);
      return list[id]
    }).join(" ");
  },
  
  prepareCards: function(deck) {
    cardSet.forEach((card, index) => {
      let derived = Object.assign({}, card, {id: index.toString()});
      deck.add(derived);
    })
    deck.shuffle();
  },

  validatePlay: function(player, target, card) {
    // is target allowed for this card?
    // player === target ?
    if (!card.requirements) {
      return true
    }
    for (const req in card.requirements) {
      if (card.requirements[req] > player.resources[req]) {
        console.log("didn't meet reqt for", req)
        return false
      }
    }
    return true
  },

  playCard: function( cardId, targetId, playerId ) {
    // CLEAN UP
    let player = this.state.candidatesById[Number.parseInt(playerId)]
    let playedCard = player.hand.find(c => c.id === cardId)
    let target = this.state.candidatesById[Number.parseInt(targetId)];
    var validated = false;
    if (this.validatePlay(player, target, playedCard)) {
      validated = true;

      player.hand.splice(player.hand.indexOf(playedCard),1)
      this.applyCardEffects(target, playedCard)

      // deal replacement card
      const drawNew = this.deck.deal(1,1) // this.deck.draw(1)
      const newCard = drawNew["1"][0]
      player.hand.push(newCard)

      // updateCardOrder: allow adding a card
      this.nextTurn()
      var updatedState = this.state
    }
    return new Promise((resolve,reject) => {
      if (!validated) {
        reject("attempted move did not validate")
      }
      resolve(updatedState)
    })
  },

  applyCardEffects: function(candidate, card) {
    const { effects, attributes } = card;
    const resourceNames = Object.keys(candidate.resources)
    for(const effect in effects) {
      if (resourceNames.includes(effect)) {
        candidate.resources[effect] += effects[effect]
      } else if (candidate.stats && typeof candidate.stats[effect] !== "undefined") {
        candidate.stats[effect] += effects[effect]
      }
    }
    attributes.forEach(attr => {
      if (candidate.characteristics.hasOwnProperty(attr)) {
        // catch NaN
        candidate.characteristics[attr]++
      } else {
        candidate.characteristics[attr] = 1
      }
    })
    this.deck.discard(card.name);
  },

  nextTurn: function() {
    // if (this.state.turn === this.ROUND_LENGTH) {
    this.state.turnNumber++
    if (this.state.turnNumber >= this.state.turnOrder.length) {
      // next round, reset to first candidate
      // or end game
      if (this.state.round <= 1) { this.endGame() }
      this.state.round = this.state.round - 1
      this.state.turnNumber = 0

    }
  },

  endGame: function() {
    var highestPolling = this.state.turnOrder.reduce(
      (a,b) => 
      this.state.candidatesById[a].polling > this.state.candidatesById[b].polling 
      ? a 
      : b
    )
    this.state.winner = highestPolling.id

    console.log("end of the game", this.state.winner)
    return new Promise((resolve, reject) => {
      try {
        resolve(this.state)
      }
      catch {
        reject("Election fraud! The game has ended, but there is problem calculating results")
      }
    })
  }
}

export default new Game();