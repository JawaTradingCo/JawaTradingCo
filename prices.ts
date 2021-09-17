import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface PricesPaneState {
  _id?: string
  _booted?: boolean
  animateSort?: boolean
  showPairs?: boolean
  boldFont?: boolean
  guess?: number
  close?: number
  funds?: number
  bet?: number
}

const getters = {} as GetterTree<PricesPaneState, PricesPaneState>

// https://coolors.co/d91f1c-eb1e2f-ef4352-77945c-3bca6d-00ff7f

const state = {
  animateSort: true,
  showPairs: false,
  boldFont: false,
  guess:0,
  close: 0,
  funds:1500,
  bet: 250,
} as PricesPaneState

const actions = {
  async boot({ state }) {
    state._booted = true
    //
  }
} as ActionTree<PricesPaneState, PricesPaneState>

const mutations = {
  TOGGLE_SORT_ANIMATION(state) {
    state.animateSort = !state.animateSort
  },
  TOGGLE_PAIRS(state) {
    state.showPairs = !state.showPairs
  },
  TOGGLE_BOLD_FONT(state) {
    state.boldFont = !state.boldFont
  },
  GUESS_HIGH(state) {
    state.guess = 1
  },
  GUESS_LOW(state) {
    state.guess = -1
    
  },
  SET_BET(state,bet) {
    state.bet = bet
  },
  SET_FUNDS(state,amount) {
    state.funds = amount
  }
} as MutationTree<PricesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PricesPaneState, PricesPaneState>
