import React from 'react';

const PrivacyContent: React.FC = () => {
  return (
    <div className="space-y-6 text-gray-300">
      <p className="text-gray-400 text-sm">Last updated: January 2025</p>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h3>
        <p className="mb-2">We collect the following types of information:</p>
        
        <div className="ml-4 space-y-3">
          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Information you provide:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Email address (for account creation and authentication)</li>
              <li>Username and profile preferences</li>
              <li>Payment information (securely processed by Stripe)</li>
              <li>Favorite drivers, teams, and personal F1 preferences</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Automatically collected:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h3>
        <p className="mb-2">We use collected information to:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Provide, maintain, and improve METRIK DELTA services</li>
          <li>Process transactions and manage subscriptions</li>
          <li>Send service-related emails and notifications</li>
          <li>Personalize your experience and recommendations</li>
          <li>Analyze usage patterns to improve our platform</li>
          <li>Detect and prevent fraud or security issues</li>
          <li>Respond to your support requests and feedback</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">3. Data Storage and Security</h3>
        <p>
          Your data is stored securely using Supabase (PostgreSQL database) with industry-standard 
          encryption. We implement appropriate technical and organizational measures including:
        </p>
        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
          <li>Encrypted data transmission (HTTPS/TLS)</li>
          <li>Secure password hashing</li>
          <li>Regular security audits</li>
          <li>Access controls and authentication</li>
          <li>Automated backups</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h3>
        <p className="mb-2">We use the following trusted third-party services:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>
            <strong className="text-white">Stripe:</strong> Payment processing and subscription management 
            (PCI DSS compliant)
          </li>
          <li>
            <strong className="text-white">Supabase:</strong> Database hosting and user authentication
          </li>
          <li>
            <strong className="text-white">Vercel:</strong> Frontend hosting and global CDN
          </li>
          <li>
            <strong className="text-white">Railway:</strong> Backend API hosting (EU and US regions)
          </li>
          <li>
            <strong className="text-white">Cloudflare:</strong> DNS, CDN, and DDoS protection
          </li>
        </ul>
        <p className="mt-3">
          These services may collect data according to their own privacy policies. We carefully 
          select partners who comply with GDPR and data protection standards.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">5. Your Rights Under GDPR</h3>
        <p className="mb-2">As an EU-based service, we comply with GDPR. You have the right to:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
          <li><strong className="text-white">Rectification:</strong> Correct inaccurate or incomplete data</li>
          <li><strong className="text-white">Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
          <li><strong className="text-white">Restriction:</strong> Limit how we process your data</li>
          <li><strong className="text-white">Portability:</strong> Receive your data in a structured format</li>
          <li><strong className="text-white">Object:</strong> Oppose certain data processing activities</li>
          <li><strong className="text-white">Withdraw consent:</strong> Revoke consent at any time</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, contact us at{' '}
          <a 
            href="mailto:contact@metrikdelta.com" 
            className="text-[#40DCA5] hover:text-[#2A9D8F] transition-colors underline"
          >
            contact@metrikdelta.com
          </a>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">6. Cookies and Tracking</h3>
        <p className="mb-2">We use cookies for:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong className="text-white">Essential cookies:</strong> Authentication and security</li>
          <li><strong className="text-white">Preference cookies:</strong> Remember your settings and language</li>
          <li><strong className="text-white">Analytics cookies:</strong> Understand how you use our service</li>
        </ul>
        <p className="mt-3">
          You can manage cookie preferences in your browser settings. Disabling certain cookies 
          may limit functionality.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">7. Data Retention</h3>
        <p>
          We retain your personal data only as long as necessary for the purposes outlined in 
          this policy or as required by law. Account data is deleted within 30 days of account 
          closure, except where retention is legally required.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h3>
        <p>
          METRIK DELTA is not intended for users under 13 years old. We do not knowingly collect 
          personal information from children. If you believe a child has provided us with personal 
          data, please contact us immediately.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">9. International Data Transfers</h3>
        <p>
          Your data may be transferred to and processed in countries outside the EU. We ensure 
          appropriate safeguards are in place, including Standard Contractual Clauses and 
          Privacy Shield frameworks where applicable.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material 
          changes via email or through a prominent notice on our service. The "Last updated" 
          date at the top indicates when changes were made.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white mb-3">11. Contact Us</h3>
        <p>
          For privacy-related questions, concerns, or to exercise your GDPR rights, contact us at:
        </p>
        <div className="mt-3 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white">
            <strong>Email:</strong>{' '}
            <a 
              href="mailto:contact@metrikdelta.com" 
              className="text-[#40DCA5] hover:text-[#2A9D8F] transition-colors underline"
            >
              contact@metrikdelta.com
            </a>
          </p>
          <p className="text-white mt-1">
            <strong>Business:</strong> METRIK DELTA (Auto-entrepreneur, France)
          </p>
        </div>
      </section>

      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-gray-500 text-sm">
          By using METRIK DELTA, you acknowledge that you have read and understood this 
          Privacy Policy and agree to the collection and use of your information as described.
        </p>
      </div>
    </div>
  );
};

export default PrivacyContent;