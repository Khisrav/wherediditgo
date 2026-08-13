import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import './styles/tokens.css'
import './styles/globals.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
