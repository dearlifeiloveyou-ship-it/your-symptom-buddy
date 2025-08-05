import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  type?: string;
  schema?: any;
}

const SEO: React.FC<SEOProps> = ({
  title = "MDSDR.com - AI-Powered Health Symptom Checker & Medical Guidance",
  description = "Get instant AI-powered health assessments with MDSDR.com. Check symptoms, receive medical triage guidance, and access personalized health coaching. Trusted by thousands for reliable health insights.",
  keywords = "symptom checker, health assessment, AI medical advice, health triage, symptom analysis, medical guidance, health coach, mental health support, medical symptoms, health diagnosis",
  url = "https://mdsdr.com",
  image = "https://mdsdr.com/og-image.png",
  type = "website",
  schema
}) => {
  const fullTitle = title.includes('MDSDR.com') ? title : `${title} | MDSDR.com`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;