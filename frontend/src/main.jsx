import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/components.css'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

function reportVitals(metric) {
  console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(1)}ms (rating: ${metric.rating})`)
}

onCLS(reportVitals)
onFCP(reportVitals)
onINP(reportVitals)
onLCP(reportVitals)
onTTFB(reportVitals)
