<template>
  <div class="pane-prices" :class="{ [mode]: true, '-bold': this.boldFont }" @mouseenter="pauseSort = true" @mouseleave="pauseSort = false">
    <pane-header :paneId="paneId" />

    <transition-group v-if="markets" :name="transitionGroupName" tag="div" class="markets-bar condensed hide-scrollbar pane">
      <div
        v-for="market in markets"
        :key="market.id"
        class="market"
        :class="{ ['-' + market.exchange]: true, ['-' + market.status]: true }"
        :title="market.id"
      >
        <div v-if="showPairs" class="market__pair" v-text="market.pair"></div>
        <div class="market__price" v-text="formatPrice(market.price)"></div>
      </div>
    </transition-group>
     <div class="game-controls">
      <div class="form">
        <div class="row">
          <div class="col-left">
            <strong>Last Price</strong>
            <div class="last-price close">-</div>
          </div>
          <div class="col-left text-center">
            <strong>Threshold (0.05%)</strong>
            <div class="text-center price-threshold">place a bet</div>
          </div>
          <div class="col-right text-right">
            <strong class="text-right d-block">Funds</strong>
            <div class="funds text-success">{{ funds }}</div>
          </div>
          <div class="col-lg-12 mb-2">
              <div class="input-group">

                <button type="button" class="btn btn-guess btn-danger guesslow" data-bs-placement="left" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="Guess Decline" >Guess ⬇</button>
               
                <select class="form-select bet" name="bet"  :value="250" >
                  <option  value="50">$50</option> <option  value="100">$100</option> <option  value="150">$150</option> <option  value="200">$200</option> <option selected value="250">$250</option> <option  value="300">$300</option> <option  value="350">$350</option> <option  value="400">$400</option> <option  value="450">$450</option> <option  value="500">$500</option></select>
                 <button type="button" class="btn btn-guess btn-success guesshigh" data-bs-placement="right" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="Guess Incline">Guess ⬆</button>
              </div>
              
          </div>
      
      
        </div>
        <h1 class="text-center text-danger d-none gameover mb-2">GAME OVER</h1>
        <strong class="text-center d-block">History</strong>
        <ul class="hide-scrollbar p-0 history"><li class="no-history text-center" style="list-style: none;color: #ffffff59;">pending bet</li></ul>
        
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import $ from 'jquery'
import { Component, Mixins, Watch } from 'vue-property-decorator'

import { formatPrice, parseMarket } from '../../utils/helpers'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market } from '@/types/test'

type MarketsBarMarketStatus = 'pending' | 'idle' | 'up' | 'down' | 'neutral'
const lastTime = Math.floor(new Date().getTime() / 1000)
let animateDuration = 0.5;
let bet = 0;
let guess = 0;
let lastPrice = 0;
let bettingRow = null;
let store = null;
let pid = null;
@Component({
  components: { PaneHeader },
  name: 'Prices'
})

export default class extends Mixins(PaneMixin) {
  mode = '-vertical'
  pauseSort = false
  markets: (Market & { price: number; status: MarketsBarMarketStatus })[] = null
 
  @Watch('pane.markets')
  private marketChange(currentMarket, previousMarkets) {

    for (const id of previousMarkets) {
      if (currentMarket.indexOf(id) === -1) {
        this.removeMarketFromList(id)
      }
    }

    for (const id of currentMarket) {
      if (previousMarkets.indexOf(id) === -1) {
        const [exchange, pair] = parseMarket(id)

        this.addMarketToList({
          id: exchange + pair,
          exchange,
          pair
        })
      }
    }
  }

  get bet() {
    return this.$store.state[this.paneId].bet
  }

  get funds() {
    return this.$store.state[this.paneId].funds
  }
  get close() {
    return this.$store.state[this.paneId].close
  }
  get guess() {
    return this.$store.state[this.paneId].guess
  }

  get activeMarkets() {
    return this.$store.state.app.activeMarkets
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get showPairs() {
    store = this.$store;
    pid = this.paneId;
    //store.state[pid].funds = 1500.00;
    return this.$store.state[this.paneId].showPairs
  }

  get boldFont() {
    return this.$store.state[this.paneId].boldFont
  }

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  mounted() {
    aggregatorService.on('prices', this.updateExchangesPrices)

    $('.btn-guess').on('click',function(e){
      e.preventDefault();
      const dateTime = new Date()
      let h = dateTime.getUTCHours()
      let m = dateTime.getUTCMinutes()
      let s = dateTime.getUTCSeconds()
      let rowclass = '', string = ''
      const price = parseFloat($('.last-price').attr('data-price'));
      lastPrice = price;
      if(!price || bettingRow){
        return true;
      }
      bet = $('select.bet').val()
      bet = parseFloat(bet).toFixed(2);

      store.state[pid].funds = store.state[pid].funds - bet;
      store.state[pid].funds = store.state[pid].funds.toFixed(2);
      if(s.toString().length == 1){
        s = "0"+s.toString()
      }
      if(m.toString().length == 1){
        m = "0"+m.toString()
      }
      if(h.toString().length == 1){
        h = "0"+h.toString()
      }

      const time = h + ':' + m + ':' + s
      if($(this).hasClass('btn-success')){
        guess = 'up';
        rowclass = '-buy';
        string = 'Betting <span class="text-warning">$' + bet + '</span> on rise from <span class="text-info">$' + parseFloat(price).toFixed(2) + '</div>'
      } else {
        guess = 'down';
        rowclass = '-sell';
        string = 'Betting <span class="text-warning">$' + bet + '</span> on drop from <span class="text-info">$' + parseFloat(price).toFixed(2) + '</div>'
      }
      $(".input-group").css({opacity:.2})
      $('.no-history').remove();
     
       bettingRow = $('<li style="--animate-duration: ' + animateDuration + 's" class="animate__animated animate__slideInLeft bg-secondary text-white trade  -level-0" ><div class="trade__side icon-side"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div></div><div class="trade__price">' + string + '</div><div class="trade__time -timestamp" timestamp="' + dateTime.getTime() + '">' + time + '</div></li>').prependTo($('.history'))
    })
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateExchangesPrices)
  }
  
  updateExchangesPrices(marketsPrices) {
    if (!this.markets) {
      this.markets = []

      for (const market of this.pane.markets) {
        const [exchange, pair] = parseMarket(market)

        this.addMarketToList({
          id: exchange + pair,
          pair,
          exchange
        })
      }
    } else {
      for (const market of this.markets) {
        //console.log(market.exchange); //BINANCE_US
        //console.log(market.id); //BINANCE_USbtcusd
        //console.log(market.pair); //btcusd
        
        const price = marketsPrices[market.id]

        if (price === market.price) {
          continue
        }

        let threshold = parseFloat(Math.abs(1 - (lastPrice / market.price)) * 100);
        const rawTime = new Date().getTime()
        const time = Math.floor(rawTime / 1000)
        const deltaTime = time - lastTime
        if(threshold == 'Infinity'){
          threshold = 0;
        }
        if(threshold && lastPrice > 0){
          threshold = parseFloat(threshold).toFixed(7)
          $('.price-threshold').text(threshold);
        }
        if(lastPrice == 0){
          $('.price-threshold').text('place a bet');
        }
        
        if (!price) {
          market.status = 'pending'
          $('.close').text('-').attr('data-price',0);
        
        } else if (market.price > price) {
          market.status = 'down'
          $('.close').html('<span class="text-danger">⯆ ' + price.toFixed(2) + '</span>').attr('data-price',price.toFixed(2));
          
        
          
        } else if (market.price < price) {
          market.status = 'up'
          $('.close').html('<span class="text-success">⯅ '+ price.toFixed(2) + '</span>').attr('data-price',price.toFixed(2));

          
        } else {
          market.status = 'neutral'
         $('.close').html('<span class="text-light">' + price.toFixed(2) + '</span>').attr('data-price',price.toFixed(2));;
         
        }
        if(threshold > 0.05 && bettingRow && (market.status == 'up' || market.status == 'down')){
          if(guess == 'up' && market.status == 'up'){
            bettingRow.replaceWith($('<li style="--animate-duration: ' + animateDuration + 's" class="animate__animated animate__flash bg-success text-white trade -' + market.exchange + ' -buy -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">Bet on ' + guess+ ' : ' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + threshold + ')</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Won $' + parseFloat(bet).toFixed(2) + '</div></li>'))
               store.state[pid].funds = parseFloat(store.state[pid].funds) + parseFloat(bet) * 2;
               store.state[pid].funds = store.state[pid].funds.toFixed(2);
          } 
          if(guess == 'up' && market.status == 'down'){
            bettingRow.replaceWith($('<li style="--animate-duration: ' + animateDuration + 's" class="animate__animated animate__flash bg-danger text-white trade -' + market.exchange + ' -buy -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">Bet on ' + guess+ ' : ' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + threshold + ')</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Lost $' + parseFloat(bet).toFixed(2) + '</div></li>'))
               
          } 
          if(guess == 'down' && market.status == 'down'){
            bettingRow.replaceWith($('<li style="--animate-duration: ' + animateDuration + 's" class="animate__animated animate__flash bg-success text-white trade -' + market.exchange + ' -sell -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">Bet on ' + guess+ ' : ' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + threshold + ')</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Won $' + parseFloat(bet).toFixed(2) + '</div></li>'))
              store.state[pid].funds = parseFloat(store.state[pid].funds) + parseFloat(bet) * 2;
              store.state[pid].funds = store.state[pid].funds.toFixed(2);
          } 
           if(guess == 'down' && market.status == 'up'){
            bettingRow.replaceWith($('<li style="--animate-duration: ' + animateDuration + 's" class="animate__animated animate__flash bg-danger text-white trade -' + market.exchange + ' -sell -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">Bet on ' + guess+ ' : ' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + threshold + ')</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Lost $' + parseFloat(bet).toFixed(2) + '</div></li>'))
              
          } 
          lastPrice = 0;
          guess = null;
          bettingRow = null;
           $(".input-group").css({opacity:1})
        }
        if(animateDuration <= 0){
          animateDuration = 0.5
        }
        $('.history').find('li:gt(40)').remove();
        market.price = price
      }
    }

    if (!this.pauseSort) {
      if (this.mode === '-horizontal') {
        this.markets = this.markets.sort((a, b) => a.price - b.price)
      } else {
        this.markets = this.markets.sort((a, b) => b.price - a.price)
      }
    }
  }

  removeMarketFromList(market: string) {
    const index = this.markets.indexOf(this.markets.find(m => m.exchange + ':' + m.pair === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
    } else {
      console.warn(`[prices] unable to remove market from list after panes.markets change: market doesn't exists in list (${market})`)
    }
  }

  addMarketToList(market: Market) {
    if (!this.markets) {
      this.markets = []
    }

    this.markets.push({
      ...market,
      status: 'pending',
      price: null
    })
  }

  formatPrice(amount) {
    return formatPrice(amount)
  }

  onResize(width: number, height: number) {
    this.mode = width > height ? '-horizontal' : '-vertical'
  }
}
</script>

<style lang="scss" scoped>
.markets-bar {
  display: flex;
  flex-direction: row;
  height: 30px;
  overflow-x: auto;
  height: 100%;
  display: none;
  @each $exchange, $icon in $exchanges {
    .market.-#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }

  .market {
    padding: 0.5em 0.5em 0.5em 2em;
    display: flex;
    flex-direction: row;
    font-size: 0.9em;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
    position: relative;
    line-height: 1;
    background-position: 0.5em;
    background-repeat: no-repeat;
    background-size: 1em;
    cursor: pointer;

    &__pair {
      white-space: nowrap;
    }

    &__price {
      margin-left: 0.5rem;
    }

    &.-up {
      background-color: transparent;
      color: lighten($green, 10%);
    }
    &.-down {
      background-color: transparent;
      color: $red;
    }
    &.-neutral {
      color: rgba(white, 0.75);
      font-style: italic;
    }
    &.-pending {
      background-color: rgba(white, 0.2);
      opacity: 0.5;
    }
    &.-hidden {
      text-decoration: line-through;
    }
  }
}

.pane-prices {
  &.-vertical .markets-bar {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    height: fit-content;
    margin-top: 45px;

    .market__price {
      margin-left: auto;
    }
  }

  &.-bold .market {
    font-weight: 600;
  }
}
</style>
