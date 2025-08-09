import jsPDF from 'jspdf';

interface AssessmentData {
  symptoms: string;
  interviewResponses?: Record<string, any>;
  profileData?: {
    age?: string;
    sex?: string;
    profileType: string;
  };
  analysisResults?: {
    triageLevel: string;
    actions: string;
    conditions: Array<{
      name: string;
      likelihood: number;
      recommendation: string;
      naturalRemedies?: string;
    }>;
  };
  // Enhanced data for comprehensive reports
  factors?: Array<{
    factor_name: string;
    factor_value: string;
    logged_at: string;
  }>;
  assessments?: Array<{
    created_at: string;
    triage_level: string;
    symptom_description: string;
  }>;
  insights?: any;
  timeRange?: string;
  userEmail?: string;
}

export const generatePDFReport = (assessmentData: AssessmentData, userEmail?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = 20;

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    doc.text(lines, margin, currentY);
    currentY += lines.length * (fontSize * 0.4) + 5;
    
    return currentY;
  };

  const addSection = (title: string, content: string) => {
    currentY += 10;
    addText(title, 14, true);
    addText(content, 12, false);
  };

  // Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MDSDR.com Health Assessment Report', margin, 20);
  
  currentY = 50;
  doc.setTextColor(0, 0, 0);

  // Generated date
  addText(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 10);

  if (userEmail) {
    addText(`Patient: ${userEmail}`, 10);
  }

  // Demographics
  if (assessmentData.profileData) {
    currentY += 5;
    addText('Patient Demographics', 14, true);
    if (assessmentData.profileData.age) {
      addText(`Age: ${assessmentData.profileData.age}`, 12);
    }
    if (assessmentData.profileData.sex) {
      addText(`Sex: ${assessmentData.profileData.sex}`, 12);
    }
    addText(`Assessment Type: ${assessmentData.profileData.profileType}`, 12);
  }

  // Symptom Description
  if (typeof assessmentData.symptoms === 'string') {
    addSection('Chief Complaint / Symptoms', assessmentData.symptoms);
  } else {
    addSection('Tracked Symptoms Summary', `This report includes ${JSON.parse(assessmentData.symptoms).length} tracked symptom entries over ${assessmentData.timeRange || 'the selected period'}.`);
  }

  // Interview Responses
  if (assessmentData.interviewResponses && Object.keys(assessmentData.interviewResponses).length > 0) {
    currentY += 10;
    addText('Additional Information', 14, true);
    
    Object.entries(assessmentData.interviewResponses).forEach(([key, value]) => {
      const questionMap: Record<string, string> = {
        fever: 'Fever or feeling feverish',
        pain_level: 'Pain level (1-10)',
        duration: 'Symptom duration',
        location: 'Location of symptoms'
      };
      
      const question = questionMap[key] || key;
      const answer = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toString();
      addText(`${question}: ${answer}`, 12);
    });
  }

  // Assessment Results (if available)
  if (assessmentData.analysisResults) {
    currentY += 10;
    addText('Assessment Results', 14, true);
    addText(`Triage Level: ${assessmentData.analysisResults.triageLevel.toUpperCase()} PRIORITY`, 12, true);

    // Possible Conditions
    if (assessmentData.analysisResults.conditions.length > 0) {
      currentY += 10;
      addText('Possible Conditions', 14, true);
      
      assessmentData.analysisResults.conditions.forEach((condition, index) => {
        addText(`${index + 1}. ${condition.name} (${condition.likelihood}% likelihood)`, 12, true);
        addText(`   Medical Recommendation: ${condition.recommendation}`, 11);
        if (condition.naturalRemedies) {
          addText(`   Natural Remedies: ${condition.naturalRemedies}`, 11);
        }
        currentY += 3;
      });
    }

    // Recommendations
    currentY += 10;
    addText('Recommended Actions', 14, true);
    addText(assessmentData.analysisResults.actions, 12);
  }

  // Health Insights (if available)
  if (assessmentData.insights && Object.keys(assessmentData.insights.trends || {}).length > 0) {
    currentY += 15;
    addText('Health Insights & Trends', 14, true);
    
    Object.entries(assessmentData.insights.trends).forEach(([symptom, trend]: [string, any]) => {
      addText(`${symptom}: ${trend.direction} (Recent avg: ${trend.recentAverage}/5)`, 12);
    });

    if (assessmentData.insights.recommendations?.length > 0) {
      currentY += 10;
      addText('Recommendations:', 12, true);
      assessmentData.insights.recommendations.forEach((rec: string) => {
        addText(`• ${rec}`, 11);
      });
    }
  }

  // Assessment History Summary
  if (assessmentData.assessments && assessmentData.assessments.length > 0) {
    currentY += 15;
    addText('Assessment History', 14, true);
    addText(`Total assessments: ${assessmentData.assessments.length}`, 12);
    
    const recentAssessments = assessmentData.assessments.slice(-3);
    recentAssessments.forEach((assessment, index) => {
      const date = new Date(assessment.created_at).toLocaleDateString();
      addText(`${index + 1}. ${date} - ${assessment.triage_level} priority`, 11);
    });
  }

  // Medical Disclaimer
  currentY += 20;
  doc.setDrawColor(255, 193, 7);
  doc.setLineWidth(1);
  doc.rect(margin - 5, currentY - 5, pageWidth - 2 * margin + 10, 60);
  
  addText('IMPORTANT MEDICAL DISCLAIMER', 12, true);
  addText('This assessment is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. The information provided should not be used for diagnosing or treating a health problem or disease. Always consult with a qualified healthcare provider for proper medical evaluation and treatment. In case of a medical emergency, call 911 immediately.', 10);
  
  addText('This report was generated by MDSDR.com automated symptom assessment system and should be reviewed by a healthcare professional.', 10);

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('© 2024 MDSDR.com - Confidential Medical Information', margin, pageHeight - 10);
  doc.text(`Page 1 of 1`, pageWidth - margin - 20, pageHeight - 10);

  // Save or open the PDF (mobile-friendly)
  const fileName = `MDSDR-Assessment-${new Date().toISOString().split('T')[0]}.pdf`;
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      doc.save(fileName);
    }
  } catch {
    // Fallback to direct download
    doc.save(fileName);
  }
};