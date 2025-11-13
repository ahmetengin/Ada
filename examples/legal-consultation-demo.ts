/**
 * Ada Hukuk Integration Demo
 * Demonstrates how ada.hukuk node provides legal services to other nodes
 */

import { HukukNode } from '../nodes/ada.hukuk/HukukNode.js';
import { MarinaNode } from '../nodes/ada.marina/MarinaNode.js';
import { SeaNode } from '../nodes/ada.sea/SeaNode.js';
import { TravelNode } from '../nodes/ada.travel/TravelNode.js';
import { CongressNode } from '../nodes/ada.congress/CongressNode.js';

async function main() {
  console.log('⚖️  Ada Hukuk - Legal Consultation Demo\n');
  console.log('='.repeat(70));

  // ==========================================
  // 1. Create Legal Node
  // ==========================================
  console.log('\n⚖️  Creating Ada Hukuk (Legal) Node...');

  const legalNode = new HukukNode({
    name: 'Ada Hukuk - Turkish Legal Services',
    firmInfo: {
      name: 'Ada Legal Consultancy',
      license: 'BAR-2024-IST-12345',
      specializations: [
        'maritime-law',
        'tourism-law',
        'commercial-law',
        'contract-law',
        'event-management-law',
      ],
    },
  });

  await legalNode.start();
  console.log(`✅ Legal node created: ${legalNode.getIdentity().id}`);
  console.log(`   Specializations: ${legalNode.getStatus().firm?.specializations.join(', ')}`);

  // Show available legal institutions
  const institutions = await legalNode.processTask({
    type: 'get-institutions',
    data: {},
  });

  console.log('\n📚 Available Turkish Legal Institutions:');
  institutions.slice(0, 5).forEach((inst: any, i: number) => {
    console.log(`   ${i + 1}. ${inst.nameTr} (${inst.name})`);
    if (inst.chambers) console.log(`      - ${inst.chambers} chambers/boards`);
  });

  // ==========================================
  // 2. Create Marina and Connect to Legal
  // ==========================================
  console.log('\n\n📍 Creating Marina Node...');

  const marina = new MarinaNode({
    name: 'West Istanbul Marina with Legal Support',
    marinaInfo: {
      name: 'West Istanbul Marina (WIM)',
      location: 'Istanbul, Turkey',
      area: 155000,
      capacity: 600,
      coordinates: { latitude: 41.0082, longitude: 28.9784 },
    },
  });

  await marina.start();

  // Connect marina to legal node
  marina.connectToNode(legalNode.getIdentity().id);
  legalNode.connectToNode(marina.getIdentity().id);

  console.log('✅ Marina node created and connected to legal node');

  // ==========================================
  // 3. Marina Requests Contract Review
  // ==========================================
  console.log('\n\n📄 Marina requesting contract review from Legal node...');

  const marinaContract = `
BERTH RENTAL CONTRACT

This agreement is made between:
1. West Istanbul Marina (WIM) - Marina Operator
2. Azure Dream Yachting Ltd. - Yacht Owner

Terms:
- Berth: A15 (24m x 6m)
- Duration: 12 months
- Monthly fee: $3,000 USD
- Services: Electricity, water, security
- Insurance: Yacht owner responsible

The yacht owner agrees to maintain comprehensive insurance...
`;

  const contractAnalysis = await legalNode.processTask({
    type: 'analyze-contract',
    data: {
      contractId: 'marina-contract-001',
      contractType: 'marina-contract',
      content: marinaContract,
      parties: ['West Istanbul Marina', 'Azure Dream Yachting Ltd.'],
      requesterId: marina.getIdentity().id,
    },
  });

  console.log('✅ Contract analysis completed:');
  console.log(`   Contract Type: ${contractAnalysis.contractType}`);
  console.log(`   Total Risks Found: ${contractAnalysis.risks.length}`);

  console.log('\n⚠️  Risk Assessment:');
  contractAnalysis.risks.forEach((risk: any, i: number) => {
    console.log(`   ${i + 1}. [${risk.severity.toUpperCase()}] ${risk.description}`);
    console.log(`      Recommendation: ${risk.recommendation}`);
    if (risk.relatedLaw) console.log(`      Related Law: ${risk.relatedLaw}`);
  });

  console.log('\n💡 Compliance Check:');
  contractAnalysis.compliance.forEach((comp: any) => {
    console.log(`   Area: ${comp.area}`);
    console.log(`   Status: ${comp.compliant ? '✅ Compliant' : '❌ Non-compliant'}`);
    console.log(`   Requirements: ${comp.requirements.join(', ')}`);
  });

  console.log('\n📋 Recommendations:');
  contractAnalysis.recommendations.forEach((rec: string, i: number) => {
    console.log(`   ${i + 1}. ${rec}`);
  });

  // ==========================================
  // 4. Search Maritime Law Cases
  // ==========================================
  console.log('\n\n🔍 Searching Maritime Law Cases...');

  const maritimeCases = await legalNode.processTask({
    type: 'search-maritime-law',
    data: {
      limit: 3,
    },
  });

  console.log(`✅ Found ${maritimeCases.length} related maritime law cases:`);
  maritimeCases.forEach((decision: any, i: number) => {
    console.log(`\n   ${i + 1}. ${decision.institution} - ${decision.decisionNumber}`);
    console.log(`      Date: ${decision.decisionDate.toLocaleDateString()}`);
    console.log(`      Subject: ${decision.subject}`);
    console.log(`      Summary: ${decision.summary}`);
  });

  // ==========================================
  // 5. Yacht Node Requests Legal Opinion
  // ==========================================
  console.log('\n\n🛥️  Creating Yacht Node and requesting legal opinion...');

  const yacht = new SeaNode({
    name: 'S/Y Azure Dream with Legal Support',
    vessel: {
      name: 'Azure Dream',
      length: 24,
      beam: 6,
      draft: 2.5,
      type: 'Sailing Yacht',
    },
  });

  await yacht.start();

  // Connect yacht to legal node
  yacht.connectToNode(legalNode.getIdentity().id);
  legalNode.connectToNode(yacht.getIdentity().id);

  const legalOpinion = await legalNode.processTask({
    type: 'legal-consultation',
    data: {
      requesterId: yacht.getIdentity().id,
      consultationType: 'legal-opinion',
      subject: 'Yacht Charter Liability',
      details: {
        question: 'What are the captain\'s responsibilities during a charter?',
        context: 'Commercial yacht charter in Turkish waters',
      },
    },
  });

  console.log('✅ Legal opinion provided:');
  console.log(`   Consultation ID: ${legalOpinion.id}`);
  console.log(`   Type: ${legalOpinion.consultationType}`);
  console.log(`   Opinion: ${legalOpinion.response.opinion}`);
  console.log(`   Relevant decisions: ${legalOpinion.response.relevantDecisions.length}`);
  console.log(`   Recommendations: ${legalOpinion.response.recommendations.length}`);

  // ==========================================
  // 6. Travel Agency Legal Consultation
  // ==========================================
  console.log('\n\n✈️  Travel Agency requesting tourism law consultation...');

  const travel = new TravelNode({
    name: 'Ada Travel with Legal Support',
    agencyInfo: {
      name: 'Ada Travel & Tours',
      license: 'TURSAB-12345',
      specializations: ['corporate-travel', 'yacht-charters'],
    },
  });

  await travel.start();

  travel.connectToNode(legalNode.getIdentity().id);
  legalNode.connectToNode(travel.getIdentity().id);

  const tourismCases = await legalNode.processTask({
    type: 'search-tourism-law',
    data: {
      limit: 2,
    },
  });

  console.log(`✅ Found ${tourismCases.length} tourism law cases for guidance`);

  const travelContractAnalysis = await legalNode.processTask({
    type: 'analyze-contract',
    data: {
      contractId: 'travel-contract-001',
      contractType: 'travel-contract',
      content: `Tour package contract with cancellation and refund terms...`,
      parties: ['Ada Travel', 'Customer'],
      requesterId: travel.getIdentity().id,
    },
  });

  console.log(`   Travel contract risks: ${travelContractAnalysis.risks.length}`);
  console.log(`   Key risk: ${travelContractAnalysis.risks[0]?.description || 'None'}`);

  // ==========================================
  // 7. Congress Event Legal Review
  // ==========================================
  console.log('\n\n🎯 Congress Node requesting event contract review...');

  const congress = new CongressNode({
    name: 'Maritime Congress with Legal Support',
    organizerInfo: {
      name: 'Global Maritime Events',
      specialization: ['maritime-conferences'],
    },
  });

  await congress.start();

  congress.connectToNode(legalNode.getIdentity().id);
  legalNode.connectToNode(congress.getIdentity().id);

  const eventContractAnalysis = await legalNode.processTask({
    type: 'analyze-contract',
    data: {
      contractId: 'event-contract-001',
      contractType: 'event-contract',
      content: `Event organization contract with force majeure clauses...`,
      parties: ['Global Maritime Events', 'Venue Owner'],
      requesterId: congress.getIdentity().id,
    },
  });

  console.log(`✅ Event contract analysis complete`);
  console.log(`   Total risks: ${eventContractAnalysis.risks.length}`);
  if (eventContractAnalysis.risks.length > 0) {
    console.log(`   Critical risks: ${eventContractAnalysis.risks.filter((r: any) => r.severity === 'critical').length}`);
  }

  // ==========================================
  // 8. Legal Node Statistics
  // ==========================================
  console.log('\n\n📊 Legal Node Statistics:');
  console.log('='.repeat(70));

  const legalStatus = legalNode.getStatus();

  console.log(`\nConsultations:`);
  console.log(`   Total: ${legalStatus.consultations.total}`);
  console.log(`   Completed: ${legalStatus.consultations.completed}`);
  console.log(`   Pending: ${legalStatus.consultations.pending}`);

  console.log(`\nSearch Statistics:`);
  console.log(`   Total searches: ${legalStatus.searchStats.totalSearches}`);
  console.log(`   Total results: ${legalStatus.searchStats.totalResults}`);
  console.log(`   Avg execution time: ${legalStatus.searchStats.averageExecutionTime.toFixed(2)}ms`);

  console.log(`\nContract Analysis:`);
  console.log(`   Total analyses: ${legalStatus.analysisStats.totalAnalyses}`);
  console.log(`   Critical risks found: ${legalStatus.analysisStats.criticalRisks}`);
  console.log(`   Avg risks per contract: ${legalStatus.analysisStats.averageRisksPerContract.toFixed(1)}`);

  console.log(`\nAnalyses by type:`);
  Object.entries(legalStatus.analysisStats.byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });

  // ==========================================
  // 9. Node Communication Example
  // ==========================================
  console.log('\n\n💬 Inter-Node Communication Example:');
  console.log('='.repeat(70));

  console.log('\n📞 Marina asks Legal node for compliance check...');

  const response = await marina.requestFromNode(
    legalNode.getIdentity().id,
    'check-legal-compliance',
    {
      area: 'maritime-law',
      documentType: 'berth-contract',
      content: 'Sample contract content...',
    }
  );

  console.log('✅ Legal node responded:');
  console.log(`   Compliant: ${response.compliance.compliant ? 'Yes' : 'No'}`);
  console.log(`   Area: ${response.compliance.area}`);

  console.log('\n='.repeat(70));
  console.log('✨ Ada Hukuk Integration Demo Completed!');
  console.log('\n🎯 Key Achievements:');
  console.log('✅ Legal node created with Turkish law database access');
  console.log('✅ Contract analysis for marina, travel, and events');
  console.log('✅ Legal consultations provided to multiple nodes');
  console.log('✅ Maritime and tourism law case searches');
  console.log('✅ Inter-node legal communication established');
  console.log('✅ Comprehensive risk assessment and compliance checking');
  console.log('='.repeat(70));
}

// Run the demo
main().catch(console.error);
