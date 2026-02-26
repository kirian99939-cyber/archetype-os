'use client';

import Script from 'next/script';

const PAYFORM_DOMAIN = 'pikaevdmitriy.payform.ru';
const CURRENCY = 'rub'; // rub | usd | eur | kzt

export default function ProdamusScript() {
  return (
    <>
      <Script
        id="prodamus-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.prodamusDomain = '${PAYFORM_DOMAIN}';
            window.prodamusCurrency = '${CURRENCY}';
          `,
        }}
      />
      <Script
        id="prodamus-widget"
        src="https://widget.prodamus.ru/src/init.js"
        strategy="afterInteractive"
      />
      {/* CSS виджета */}
      <link rel="stylesheet" href="https://widget.prodamus.ru/src/init.css" />
    </>
  );
}
