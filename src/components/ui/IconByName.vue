<script setup lang="ts">
import {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  Receipt,
  GraduationCap,
  CircleEllipsis,
  Briefcase,
  Laptop,
  Gift,
  PlusCircle,
  Circle,
  Wallet,
  PiggyBank,
  CreditCard,
  Banknote,
} from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 20 },
)

const map: Record<string, unknown> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  'shopping-bag': ShoppingBag,
  clapperboard: Clapperboard,
  'heart-pulse': HeartPulse,
  receipt: Receipt,
  'graduation-cap': GraduationCap,
  'circle-ellipsis': CircleEllipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  gift: Gift,
  'plus-circle': PlusCircle,
  circle: Circle,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  banknote: Banknote,
}

const icon = computed(() => (map[props.name] as typeof Circle) ?? Circle)
</script>

<template>
  <component :is="icon" :size="size" />
</template>
