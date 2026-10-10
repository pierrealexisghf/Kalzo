import MealAI from './stack/MealAI'
import FoodSearch from './stack/FoodSearch'
import QuickMeal from './stack/QuickMeal'
import Recipes from './stack/Recipes'
import SportAdd from './stack/SportAdd'
import Frigo from './stack/Frigo'
import Restaurant from './stack/Restaurant'
import Batch from './stack/Batch'
import Plan from './stack/Plan'
import Goals from './stack/Goals'
import Subscription from './stack/Subscription'

// Écrans qui s'ouvrent par-dessus un onglet (avec un bouton retour).
export const STACK_SCREENS = {
  'meal-ai': MealAI,
  'food-search': FoodSearch,
  'quick-meal': QuickMeal,
  recipes: Recipes,
  'sport-add': SportAdd,
  frigo: Frigo,
  restaurant: Restaurant,
  batch: Batch,
  plan: Plan,
  goals: Goals,
  subscription: Subscription,
}
