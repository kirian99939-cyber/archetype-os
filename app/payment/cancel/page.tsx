export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="text-center space-y-4">
        <div className="text-5xl">😔</div>
        <h1 className="text-2xl font-bold text-white">Оплата не завершена</h1>
        <p className="text-white/60">Вы можете попробовать ещё раз.</p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl text-white/80 border border-white/20 font-medium"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
