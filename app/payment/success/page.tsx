export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-white">Оплата прошла успешно!</h1>
        <p className="text-white/60">Доступ к функциям активирован.</p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
        >
          Вернуться на главную
        </a>
      </div>
    </div>
  );
}
