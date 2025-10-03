// Design System - Centralized styling and theme
export const colors = {
  background: {
    primary: 'bg-[#f0eee6]',
    secondary: 'bg-gray-100',
    card: 'bg-white',
    input: 'bg-white',
  },
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    muted: 'text-gray-500',
  },
  borders: {
    primary: 'border-gray-300',
    secondary: 'border-gray-200',
  },
  buttons: {
    primary: 'bg-white hover:bg-gray-50 text-gray-900',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    black: 'bg-black hover:bg-gray-800 text-white',
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
  page: 'min-h-screen bg-[#f0eee6]',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  card: 'bg-white rounded-xl shadow-lg border border-gray-200 p-6',
  section: 'mb-8',
}

export const typography = {
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-xl font-semibold text-gray-900',
  h3: 'text-lg font-semibold text-gray-900',
  body: 'text-gray-700',
  label: 'text-sm font-medium text-gray-700',
  caption: 'text-sm text-gray-500',
}
