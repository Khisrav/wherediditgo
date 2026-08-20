import { ref, watch } from 'vue'

export function useDebouncedSearch(delayMs = 250) {
  const query = ref('')
  const debouncedQuery = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(query, (newVal) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedQuery.value = newVal.trim()
    }, delayMs)
  })

  return {
    query,
    debouncedQuery,
  }
}
