const { pool } = require('../config/db');

const testEntries = [
  {
    title: 'Firewall Configuratie Best Practices',
    content: `Een goede firewall configuratie is essentieel voor de beveiliging van je netwerk. Hier zijn enkele belangrijke richtlijnen:

1. **Least Privilege Principe**: Blokkeer alles standaard en sta alleen noodzakelijke verbindingen toe.

2. **Regelmatige Updates**: Zorg ervoor dat je firewall firmware altijd up-to-date is.

3. **Logging & Monitoring**: Activeer uitgebreide logging voor alle firewall events.

4. **Segmentatie**: Gebruik VLAN's en firewall zones voor netwerk segmentatie.

5. **Regular Audits**: Voer maandelijks audits uit op je firewall regels.

Let op: Documenteer altijd je wijzigingen en test ze eerst in een test omgeving!`,
    category: 'Security',
    tags: ['firewall', 'netwerk beveiliging', 'best practice', 'configuratie'],
    author_id: 1
  },
  {
    title: 'Incident Response Procedure',
    content: `Bij een security incident is snelle en gestructureerde actie cruciaal. Volg deze stappen:

**Fase 1: Detectie & Analyse**
- Verzamel alle beschikbare informatie
- Classificeer de ernst van het incident
- Documenteer alles vanaf het begin

**Fase 2: Containment**
- Isoleer getroffen systemen
- Voorkom verdere schade
- Bewaar forensisch bewijs

**Fase 3: Eradication & Recovery**
- Verwijder de threat
- Herstel systemen naar normale staat
- Monitor voor tekenen van terugkeer

**Fase 4: Post-Incident**
- Analyseer wat er gebeurd is
- Update procedures indien nodig
- Deel geleerde lessen met het team

Vergeet niet: Communicatie met stakeholders is gedurende het hele proces essentieel!`,
    category: 'Incident',
    tags: ['incident response', 'security', 'procedure', 'forensics'],
    author_id: 1
  },
  {
    title: 'Asset Inventory Management Tips',
    content: `Een accurate asset inventory is de basis van goed security management. Hier lees je hoe:

**Automatisatie is Key**
Gebruik tools zoals Nmap, Lansweeper, of SCCM voor automatische discovery.

**Categorisatie**
- Kritieke assets (servers, databases)
- Standaard workstations
- IoT devices en printers
- Mobile devices

**Belangrijke Attributen**
- IP adres & MAC adres
- Operating system & versie
- Installed software
- Laatste update datum
- Owner/responsible person

**Regelmatige Updates**
Plan maandelijkse scans en quarterly manual reviews.

**Security Implicaties**
- Onbekende assets = security risico's
- Patch management wordt veel effectiever
- Compliance reporting wordt eenvoudiger

Pro tip: Integreer je asset database met je vulnerability scanner voor maximaal effect!`,
    category: 'Asset',
    tags: ['asset management', 'inventory', 'security', 'automation'],
    author_id: 1
  },
  {
    title: 'VPN Troubleshooting Guide',
    content: `VPN problemen kunnen complex zijn. Deze guide helpt je bij het systematisch troubleshooten:

**Stap 1: Basis Connectiviteit**
- Ping de VPN server
- Check DNS resolution
- Verify internet connectivity

**Stap 2: Certificate Issues**
- Check certificate expiration
- Verify CA chain
- Look for certificate revocation

**Stap 3: Authentication Problems**
- Verify username/password
- Check AD/LDAP connectivity
- Review MFA settings

**Stap 4: Network Issues**
- Check routing tables
- Verify firewall rules
- Test different protocols (UDP/TCP)

**Stap 5: Client Configuration**
- Compare working vs non-working configs
- Check client software version
- Review local firewall settings

**Common Solutions:**
- Restart VPN service
- Clear DNS cache
- Update VPN client
- Check for conflicting software

Remember: Always check the logs first - they contain valuable diagnostic information!`,
    category: 'Network',
    tags: ['vpn', 'troubleshooting', 'netwerk', 'connectivity'],
    author_id: 1
  }
];

const addTestEntries = async () => {
  try {
    console.log('Adding test knowledge base entries...');
    
    for (const entry of testEntries) {
      // Generate AI summary (simplified for demo)
      const aiSummary = entry.content.substring(0, 200) + '...';
      
      await pool.query(`
        INSERT INTO knowledge_base (title, content, category, tags, author_id, ai_processed, ai_summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        entry.title,
        entry.content,
        entry.category,
        JSON.stringify(entry.tags),
        entry.author_id,
        true,
        aiSummary
      ]);
      
      console.log(`✓ Added: ${entry.title}`);
    }
    
    console.log('\n🎉 All test entries added successfully!');
    console.log('You can now test the Knowledge Base functionality.');
    
  } catch (error) {
    console.error('Error adding test entries:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addTestEntries()
    .then(() => {
      console.log('Test data setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { addTestEntries }; 