import { useNavigate } from 'react-router-dom'
import { XCircle, Home, RotateCcw } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function CancelPage() {
  const navigate = useNavigate()

  const handleRetry = () => {
    // Retour à la homepage où le user pourra re-cliquer sur upgrade
    navigate('/')
  }

  return (
    <>
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="min-h-screen bg-metrik-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-metrik-card rounded-2xl border border-red-500/30 p-8 md:p-12 text-center">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <XCircle className="w-24 h-24 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Payment cancelled
        </h1>

        {/* Description */}
        <p className="text-gray-300 text-lg mb-8">
          Your payment was not processed. No amount has been charged.
        </p>

        {/* Info Box */}
        <div className="bg-metrik-black/50 rounded-xl p-6 mb-8 border border-turquoise-500/20">
          <p className="text-gray-300 text-left">
            You can continue using METRIK DELTA with <span className="text-turquoise-500 font-semibold">12 free requests per day</span>,
            or subscribe to METRIK+ at any time for unlimited access.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="px-8 py-4 bg-turquoise-500 hover:bg-[#00d4bb] text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try again
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-metrik-card hover:bg-gray-800 text-white font-bold rounded-lg transition-colors border border-turquoise-500/30 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to home
          </button>
        </div>

        {/* Help */}
        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact us on{' '}
          <a href="https://twitter.com/metrikdelta" className="text-turquoise-500 hover:underline">
            Twitter
          </a>
        </p>
      </div>
    </div>
    </>
  )
}