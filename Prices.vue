<template>
  <div data-loading-text="Loading" class="pane-prices loading" :class="{ [mode]: true, '-bold': this.boldFont }" @mouseenter="pauseSort = true" @mouseleave="pauseSort = false">
    <pane-header :paneId="paneId" /> 


   
     <div class="game-controls">
      <div class="form">
        <div class="row">
          <div class="col-left">
            <strong>Current Price</strong>
            <div class="last-price close">-</div>
          </div>
          <div class="col-left text-center">
            <strong>Threshold (0.05%)</strong>
            <div class="text-center price-threshold" style="--animate-duration: 0.2s">wait...</div>
          </div>
          <div class="col-right text-right">
            <strong class="text-right d-block">Funds</strong>
            <div class="funds text-success animate__animated">${{ funds }}</div>
          </div>
          <div class="col-lg-12 mb-2">
              <div class="input-group">

                <button type="button" class="btn btn-guess btn-danger guesslow" data-bs-placement="left" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="Wager Low" >Wager Low</button>
               
                <select class="form-select bet" name="bet"  >
                  <option  value="50">$50</option> <option  value="100">$100</option> <option  value="150">$150</option> <option  value="200">$200</option> <option selected value="250">$250</option> <option  value="300">$300</option> <option  value="350">$350</option> <option  value="400">$400</option> <option  value="450">$450</option> <option  value="500">$500</option><option  value="1000">$1000</option></select>
                 <button type="button" class="btn btn-guess btn-success guesshigh" data-bs-placement="right" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="Wager High">Wager High</button>
              </div>
              
          </div>
      
      
        </div>
        <h1 class="text-center text-danger d-none gameover mb-2">GAME OVER</h1>
        <strong class="text-center d-block d-none history-label mb-2">Wager History</strong>
        <ul class="hide-scrollbar p-0 history"></ul>
        <div class="alert alert-primary text-white bg-primary p-1 mx-0 text-center">To get started, wager high or low on the current price!</div> 
      </div>
    </div>
    
    
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
  </div>
</template>

<script lang="ts">
import $ from 'jquery'
import { Component, Mixins, Watch } from 'vue-property-decorator'

import { formatPrice, parseMarket } from '../../utils/helpers'
import workspacesService from '@/services/workspacesService'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market } from '@/types/test'
import { Wagers } from '@/store/panesSettings/prices'
type MarketsBarMarketStatus = 'pending' | 'idle' | 'up' | 'down' | 'neutral'

let animateDuration = 0.5;
let marketsLoaded = false;
let wageTimer = 0;
let polls = 0;
let lastPrice = 0;
let bettingRow = null;
let store = null;
let pid = null;
let triggerOnce = false;
const breakpoint = 0.05
@Component({
  components: { PaneHeader },
  name: 'Prices'
})

export default class extends Mixins(PaneMixin) {
  private _onStoreMutation: () => void
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

  

  get funds() {
    return this.$store.state[this.paneId].funds
  }
 
  get wagers(): Wagers[] {
    
    return this.$store.state[this.paneId].wagers
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
    if(!triggerOnce){
      $(".pane-prices  .toolbar .icon-search").parent('button').remove();
      $(".pane-prices  .toolbar .dropdown").html('&nbsp;');
      $(".pane-prices  .toolbar .icon-cog").removeClass("icon-cog").addClass("icon-info").css({opacity:1})
      triggerOnce = true;
      store = this.$store;
      pid = this.paneId;
      for (let i = 0; i < this.wagers.length; i++) {
        $(this.wagers[i ].html).prependTo($('.history'))
        
      }
      if(parseInt(store.state[pid].funds) * 1 <= 0){
        this.resetAndReloadWithoutAsking();
      }
     
    }
    
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
  created(){

   
    this._onStoreMutation = this.$store.subscribe(mutation => {
    
      if(mutation.type == 'prices/ADD_WAGERS'){
        console.log( store.state[pid].wagers);
      }
      if(mutation.type == 'app/CREATE_NOTICE' && mutation.payload.id == 'connections' && mutation.payload.type == 'success' || marketsLoaded == true){
        marketsLoaded = true;
       $('.pane-prices.loading').removeClass("loading");
      
      }
      if(mutation.type == 'app/ADD_ACTIVE_MARKET'){
        $(".pane-prices").attr("data-loading-text","Loading " + mutation.payload.exchangeId);
      }
      
    })
  }
  mounted() {
    aggregatorService.on('prices', this.updateExchangesPrices)
    $(window).keypress(function(event) {
      event.preventDefault();
      
      if (event.which == 32 ) {
        $(".menu").show();
      }
      return false;
      });
      $("select.bet").on("change",function(){
        store.state[pid].bet = +$(this).val();
      })

    $('.btn-guess').on('click',function(e){
      $('.alert-primary').remove();
      $(".funds").removeClass("animate__bounce animate__flash");
      e.preventDefault();
      const dateTime = new Date()
      let h = dateTime.getUTCHours().toString()
      let m = dateTime.getUTCMinutes().toString()
      let s = dateTime.getUTCSeconds().toString()
      if(s.length == 1){
        s = "0"+s
      }
      if(m.length == 1){
        m = "0"+m
      }
      if(h.length == 1){
        h = "0"+h
      }
      const time = h + ':' + m + ':' + s
      const price = parseFloat($('.last-price').attr('data-price'));
      lastPrice = price;
      if(!price || bettingRow){
        return true;
      }
      
     
      if(store.state[pid].bet > Number(store.state[pid].funds)){
        lastPrice = 0;
        $(".funds").addClass("animate__bounce animate__flash");
        return true;
      } else {
        polls = 0;
      wageTimer = 0;
      store.state[pid].funds = store.state[pid].funds - store.state[pid].bet;
      $(".funds").addClass("animate__bounce animate__headShake");
      store.state[pid].funds = store.state[pid].funds.toFixed(2);
      store.commit(pid + '/SET_FUNDS', store.state[pid].funds);

      let msg = '';

      if($(this).hasClass('btn-success')){
        store.state[pid].guess = 'up';
        
        msg = 'Betting <span class="text-warning">$' +store.state[pid].bet + '</span> on rise from <span class="text-info">$' + price + '</div>'
      } else {
        store.state[pid].guess = 'down';
        
        msg = 'Betting <span class="text-warning">$' + store.state[pid].bet + '</span> on drop from <span class="text-info">$' + price + '</div>'
      }
      if(wageTimer == 0){
        wageTimer++;
      }
      $(".input-group").css({opacity:.2})
      $("select.bet").attr("disabled",true);
      $('.history-label').removeClass('d-none');
      const rowHtml = "<li style='--animate-duration: " + animateDuration + "s' class='animate__animated animate__slideInLeft bg-secondary text-white trade  -level-0' ><div class='trade__side icon-side'><div class='spinner-border spinner-border-sm' role='status'><span class='visually-hidden'>Loading...</span></div></div><div class='trade__price'>" + msg + "</div><div class='trade__time -timestamp' timestamp='" + dateTime.getTime() + "'>" + time + "</div></li>";
       bettingRow = $(rowHtml).prependTo($('.history'))
      }
      
    })
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateExchangesPrices)
    this._onStoreMutation()
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
      if($(".pane-prices").attr("data-loading-text") == "Loading"){
        $(".pane-prices").removeClass("loading");
      }
      for (const market of this.markets) {
        //console.log(market.exchange); //BINANCE_US
        //console.log(market.id); //BINANCE_USbtcusd
        //console.log(market.pair); //btcusd
        
        const price = marketsPrices[market.id]

        if (price === market.price) {
          continue
        }
       
        polls ++;
        const divided: number = +lastPrice / +market.price;
        store.state[pid].threshold = Math.abs(1 - (divided)) * 100;
        const rawTime = new Date().getTime()
       
        
        if(store.state[pid].threshold == 'Infinity'){
          store.state[pid].threshold = 0;
        }
        $('.price-threshold').removeClass("animate__animated animate__pulse");
        if(store.state[pid].threshold && lastPrice > 0){
          store.state[pid].threshold = parseFloat(store.state[pid].threshold).toFixed(7 )
          $('.price-threshold').text(store.state[pid].threshold+"%").addClass('animate__animated animate__pulse');
        }
        if(lastPrice == 0){
          $('.price-threshold').text('-');
        }
        
        if (!price) {
          market.status = 'pending'
          $('.close').text('-').attr('data-price',0);

        
        } else if (market.price > price) {
          market.status = 'down'
          $('.close').html('<span class="text-danger">' + price.toFixed(2) + ' ⯆</span>').attr('data-price',price.toFixed(2));
          
        
          
        } else if (market.price < price) {
          market.status = 'up'
          $('.close').html('<span class="text-success">'+ price.toFixed(2) + ' ⯅</span>').attr('data-price',price.toFixed(2));

          
        } else {
          market.status = 'neutral'
         $('.close').html('<span class="text-light">' + price.toFixed(2) + '</span>').attr('data-price',price.toFixed(2));;
         
        }
        if(lastPrice > 0){
          $('.close').append('<div class="text-warning threshold-reference">  '+ lastPrice.toFixed(2) + '</div>')
        }
        let newRow = '';
        if(store.state[pid].threshold > breakpoint && bettingRow && (market.status == 'up' || market.status == 'down')){
          if(store.state[pid].guess == 'up' && market.status == 'up'){
              newRow = '<li style="--animate-duration: ' + animateDuration + 's;margin-top:1px;" class="animate__animated animate__slideInRight bg-success text-white trade -' + market.exchange + ' -buy -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + store.state[pid].threshold + ' - ' + polls + ' polls)</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Won $' + store.state[pid].bet.toFixed(2) + '</div></li>';
              bettingRow.replaceWith($(newRow));
              store.state[pid].funds = parseFloat(store.state[pid].funds) + store.state[pid].bet * 2;
              store.state[pid].funds = store.state[pid].funds.toFixed(2);
              store.commit(pid + '/SET_FUNDS', store.state[pid].funds);

          } 
          if(store.state[pid].guess == 'up' && market.status == 'down'){
            newRow = '<li style="--animate-duration: ' + animateDuration + 's;margin-top:1px;" class="animate__animated animate__slideInRight bg-danger text-white trade -' + market.exchange + ' -buy -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + store.state[pid].threshold + ' - ' + polls + ' polls)</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Lost $' + store.state[pid].bet.toFixed(2) + '</div></li>';
            bettingRow.replaceWith($(newRow));
               
          } 
          if(store.state[pid].guess == 'down' && market.status == 'down'){
            newRow = '<li style="--animate-duration: ' + animateDuration + 's;margin-top:1px;" class="animate__animated animate__slideInRight bg-primary text-white trade -' + market.exchange + ' -sell -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + store.state[pid].threshold + ' - ' + polls + ' polls)</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Won $' + store.state[pid].bet.toFixed(2) + '</div></li>';
            bettingRow.replaceWith($(newRow))
              store.state[pid].funds = parseFloat(store.state[pid].funds) + store.state[pid].bet * 2;
              store.state[pid].funds = store.state[pid].funds.toFixed(2);
              store.commit(pid + '/SET_FUNDS', store.state[pid].funds);
          } 
           if(store.state[pid].guess == 'down' && market.status == 'up'){
            newRow = '<li style="--animate-duration: ' + animateDuration + 's;margin-top:1px;" class="animate__animated animate__slideInRight bg-danger text-white trade -' + market.exchange + ' -sell -level-0" title="' + market.exchange + ':' + market.pair + '"><div class="trade__side icon-side"></div><div class="trade__exchange"></div><div class="trade__price">' + lastPrice.toFixed(2) + ' &gt; ' + price.toFixed(2) + ' (' + store.state[pid].threshold + ' - ' + polls + ' polls)</div><div class="trade__time -timestamp" timestamp="' + rawTime + '">Lost $' + store.state[pid].bet.toFixed(2) + '</div></li>';
            bettingRow.replaceWith($(newRow));
              
          }
          $(".funds").removeClass("animate__bounce");
          $(".funds").addClass("animate__bounce animate__heartBeat");
          //$("select.bet").append('<option value="'+parseInt(store.state[pid].funds)+'">$'+parseInt(store.state[pid].funds)+'</option>')
          lastPrice = 0;
          polls = 0;
          store.state[pid].guess = null;
          store.commit(pid + '/ADD_WAGERS', newRow);
          bettingRow = null;
          $(".threshold-reference").remove();
           $(".input-group").css({opacity:1})
           $("select.bet").removeAttr("disabled");
           if(store.state[pid].funds <= 50){
             $(".gameover").removeClass('d-none');
              $(".input-group").css({opacity:.2})
              $(".input-group button").attr("disabled",true);
              $("select.bet").attr("disabled",true);
              $('.price-threshold').text('betting is closed');
              this.resetAndReload()
           }
        }
        if(animateDuration <= 0){
          animateDuration = 0.5
        }
        //$('.history').find('li:gt(40)').remove();
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
  
  async resetAndReload() {
    const response = await dialogService.confirm({
      title: 'Game Over',
      message: 'Do you want to start a new game ?',
      ok: 'Yes'
    })
    
    if (response === true) {
      await workspacesService.removeWorkspace(window.location.pathname.replace(/\//,''));
      const newLocation = window.location.origin;
      window.open(newLocation);
    }
  }
  async resetAndReloadWithoutAsking() {
   
      await workspacesService.removeWorkspace(window.location.pathname.replace(/\//,''));
      const newLocation = window.location.origin;
      window.open(newLocation);
     
    
  }
  removeMarketFromList(market: string) {
    const index = this.markets.indexOf(this.markets.find(m => m.exchange + ':' + m.pair === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
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
  position: absolute;
  bottom: 15px;
  flex-flow:  wrap;
  @each $exchange, $icon in $exchanges {
    .market.-#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }
  
  .market {
    padding: 0.5em 0.5em 0.5em 2em;
    display: inline-flex;
    
    font-size: 16px;
    align-items: center;
    flex-grow: 0;
    flex-shrink: 0;
    flex-basis: 200px;
    position: relative;
    line-height: 1;
    background-position: 0.5em;
    background-repeat: no-repeat;
    background-size: 1em;
    cursor: pointer;
    margin: 1px;

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
.markets-bar.condensed.hide-scrollbar.pane {
    height: 25%;
}
.pane-prices {
  &.-vertical .markets-bar {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 93%;
    height: fit-content;
    margin: 5px 15px;
    flex-wrap: wrap;
    .market__price {
      margin-left: auto;
    }
  }

  &.-bold .market {
    font-weight: 600;
  }
}
.pane-prices.loading:before {
    content: attr(data-loading-text) ' ';
    position: absolute;
    background: #000000cc;
    width: 100%;
    height: 100%;
    z-index: 3;
    color: white;
    text-align: center;
    padding-top: 25vh;
    font-size: 40px;
    line-height: calc(50% - 88px);
}
</style>
