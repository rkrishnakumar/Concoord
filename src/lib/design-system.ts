// Design System - Centralized styling and theme
export const colors = {
  background: {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-700',
    card: 'bg-gray-800',
    input: 'bg-gray-600',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    muted: 'text-gray-400',
  },
  borders: {
    primary: 'border-gray-700',
    secondary: 'border-gray-600',
  },
  buttons: {
    primary: 'bg-white hover:bg-gray-50 text-gray-900',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    success: 'bg-green-100 hover:bg-green-200 text-green-900',
    danger: 'bg-red-100 hover:bg-red-200 text-red-900',
  },
  status: {
    success: 'bg-green-900 text-green-200',
    error: 'bg-red-900 text-red-200',
    warning: 'bg-yellow-900 text-yellow-200',
    info: 'bg-blue-900 text-blue-200',
  }
}

export const spacing = {
  page: 'min-h-screen bg-gray-800',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  card: 'bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6',
  section: 'mb-8',
}

export const typography = {
  h1: 'text-3xl font-bold text-white',
  h2: 'text-xl font-semibold text-white',
  h3: 'text-lg font-semibold text-white',
  body: 'text-gray-300',
  label: 'text-sm font-medium text-gray-300',
  caption: 'text-sm text-gray-400',
}
