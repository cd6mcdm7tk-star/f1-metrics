import React from 'react';

const TermsContent: React.FC = () => {
  return (
    <div className="space-y-6 text-gray-300">
      <p className="text-gray-400 text-sm">Last updated: January 2025</p>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h3>
        <p>
          By accessing and using METRIK DELTA, you accept and agree to be bound by the terms 
          and provision of this agreement. If you do not agree to these terms, please do not 
          use our service.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">2. Use of Service</h3>
        <p>
          METRIK DELTA provides Formula 1 telemetry analysis and visualization services. 
          You agree to use this service only for lawful purposes and in accordance with these Terms.
        </p>
        <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
          <li>Do not use the service for any illegal activities</li>
          <li>Do not attempt to reverse engineer or hack the platform</li>
          <li>Do not resell or redistribute our data without permission</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">3. User Accounts</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials 
          and for all activities that occur under your account. You must immediately notify us 
          of any unauthorized use of your account.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">4. Subscriptions and Payments</h3>
        <p className="mb-2">
          We offer Free, Premium, and Pro subscription tiers:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Free:</strong> Limited to 5 requests per day</li>
          <li><strong>Premium (€4.99/month):</strong> Unlimited requests and additional features</li>
          <li><strong>Pro (€14.99/month):</strong> All Premium features plus advanced analytics</li>
        </ul>
        <p className="mt-3">
          All payments are processed securely through Stripe. Subscriptions automatically renew 
          unless cancelled. Prices are subject to change with 30 days advance notice.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">5. Cancellation and Refunds</h3>
        <p>
          You may cancel your subscription at any time from your account settings. Cancellations 
          take effect at the end of the current billing period. For refund information, please 
          see our Refund Policy.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h3>
        <p>
          All content, features, and functionality of METRIK DELTA are owned by us and are 
          protected by international copyright, trademark, and other intellectual property laws.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">7. Data Attribution</h3>
        <p>
          METRIK DELTA uses data from FastF1 and Ergast API. All Formula 1 trademarks, names, 
          and data are property of Formula One World Championship Limited. We are not affiliated 
          with or endorsed by Formula 1.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h3>
        <p>
          METRIK DELTA is provided "as is" without warranties of any kind. We are not liable 
          for any damages arising from your use of the service, including but not limited to 
          data inaccuracies, service interruptions, or financial losses.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of 
          material changes via email or through the service. Continued use after changes 
          constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">10. Governing Law</h3>
        <p>
          These Terms are governed by the laws of France. Any disputes shall be resolved in 
          the courts of France.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">11. Contact</h3>
        <p>
          For questions about these Terms, contact us at:{' '}
          <a 
            href="mailto:contact@metrikdelta.com" 
            className="text-[#40DCA5] hover:text-[#2A9D8F] transition-colors underline"
          >
            contact@metrikdelta.com
          </a>
        </p>
      </section>

      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-gray-500 text-sm">
          By using METRIK DELTA, you acknowledge that you have read, understood, and agree 
          to be bound by these Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default TermsContent;