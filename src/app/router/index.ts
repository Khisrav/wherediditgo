import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/features/onboarding/OnboardingView.vue'),
      meta: { hideNav: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/HomeView.vue'),
    },
    {
      path: '/activity',
      name: 'activity',
      component: () => import('@/features/activity/ActivityView.vue'),
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import('@/features/budgets/BudgetsView.vue'),
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/features/insights/InsightsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/features/settings/SettingsView.vue'),
      meta: { hideNav: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('@/features/accounts/AccountsView.vue'),
      meta: { hideNav: true },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
