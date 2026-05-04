// frontend/src/components/accidents/CnamDeclarationModal.jsx
import React, { useState, useRef } from 'react';
import { X, Printer, Save } from 'lucide-react';

const CnamDeclarationModal = ({ accident, agent, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const printRef = useRef();
  
  const [formData, setFormData] = useState({
    declarant_nom: '',
    lieu_declaration: 'Bizerte',
    date_declaration: new Date().toLocaleDateString('fr-FR'),
    arret_travail: true,
    salaire_maintenu: true,
    tiers_responsable: false,
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    await onConfirm(formData);
    setLoading(false);
  };
  
  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Déclaration Accident de Travail - CNSS</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 2cm; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.3; background: white; }
          .document { max-width: 100%; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header-text { font-weight: bold; font-size: 12pt; line-height: 1.4; }
          .title { font-size: 18pt; font-weight: bold; margin: 10px 0 5px; text-decoration: underline; }
          .subtitle { font-style: italic; font-size: 10pt; margin: 5px 0; }
          .notice { font-size: 9pt; margin: 8px 0; color: #555; }
          .important { border: 1px solid #c00; padding: 6px 10px; margin: 10px 0; background: #fff0f0; font-size: 10pt; text-align: center; }
          .section { border: 1px solid #000; padding: 10px; margin-bottom: 12px; }
          .section-title { font-weight: bold; font-size: 12pt; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px; }
          .row { margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
          .field { flex: 1; min-width: 180px; }
          .field label { font-weight: bold; display: block; margin-bottom: 2px; font-size: 10pt; }
          .field-value { border-bottom: 1px solid #000; padding: 2px 5px; min-height: 22px; }
          .box { width: 22px; height: 22px; border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11pt; margin-right: 3px; }
          .box-small { width: 20px; height: 20px; border: 1px solid #000; text-align: center; font-size: 10pt; margin-right: 2px; }
          .input-line { border: none; border-bottom: 1px solid #000; padding: 2px 5px; font-family: inherit; font-size: 10pt; background: transparent; }
          .input-box { border: 1px solid #000; padding: 2px 5px; font-family: inherit; font-size: 10pt; }
          .textarea { width: 100%; border: 1px solid #000; padding: 5px; font-family: inherit; font-size: 10pt; resize: vertical; }
          .inline-group { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
          .checkbox-group { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-top: 3px; }
          .checkbox { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
          .checkbox input { width: 14px; height: 14px; margin: 0; cursor: pointer; }
          .declaration { margin-top: 15px; padding-top: 10px; border-top: 1px solid #000; }
          .declaration p { margin: 8px 0; }
          .declaration ul { margin: 8px 0 10px 25px; }
          .signature { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
          .signature-line { text-align: center; margin-top: 10px; }
          .line { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
          hr { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="document">
          ${printContent}
        </div>
        <script>window.onload = function() { window.print(); window.close(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const accidentDate = (() => {
    if (!accident?.date_accident) return { day: '', month: '', year: '' };
    const [year, month, day] = accident.date_accident.split('-');
    return { day, month, year };
  })();
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <h2>📄 Déclaration d'accident de travail - CNSS</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div ref={printRef} className="document">
            
            {/* HEADER */}
            <div className="header">
              <div className="header-text">
                <strong>REPUBLIQUE TUNISIENNE</strong><br />
                <strong>MINISTÈRE DES AFFAIRES SOCIALES ET DE LA SOLIDARITÉ</strong><br />
                <strong>CAISSE NATIONALE DE SECURITE SOCIALE</strong>
              </div>
              <div className="title">
                <strong>DECLARATION D'ACCIDENT DE TRAVAIL</strong>
              </div>
              <div className="subtitle">
                (Loi n°94-28 du 21 février 1994)
              </div>
              <div className="notice">
                Au moment de remplir cette déclaration, veuillez consulter attentivement la notice d'utilisation
              </div>
              <div className="important">
                <strong>IMPORTANT</strong><br />
                Joindre obligatoirement à la Déclaration adressée à la CNSS le certificat médical initial.
              </div>
            </div>
            
            {/* EMPLOYEUR */}
            <div className="section">
              <div className="section-title">EMPLOYEUR</div>
              
              <div className="row">
                <div className="field">
                  <label>Numéro d'affiliation à la C.N.S.S :</label>
                  <div>
                    {[...Array(11)].map((_, i) => (
                      <input key={i} type="text" maxLength="1" className="box" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Nom ou Raison Sociale:</label>
                  <div className="field-value"><strong>SOCIÉTÉ RÉGIONALE DE TRANSPORT DE BIZERTE</strong></div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Adresse:</label>
                  <div className="field-value">Rue 20 Mars 1956 Bizerte</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Code Postal :</label>
                  <div>{[...Array(11)].map((_, i) => (<input key={i} type="text" maxLength="1" className="box" />))}</div>
                </div>
                <div className="field">
                  <label>N° Téléphone:</label>
                  <div className="field-value">72 431 317</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Nature de l'activité:</label>
                  <div className="field-value">Transport de Voyageur en Communs.</div>
                </div>
              </div>
            </div>
            
            {/* VICTIME */}
            <div className="section">
              <div className="section-title">VICTIME</div>
              
              <div className="row">
                <div className="field">
                  <label>Numéro Matricule à la C.N.S.S :</label>
                  <div>{[...Array(11)].map((_, i) => (<input key={i} type="text" maxLength="1" className="box" />))}</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Nom et prénom:</label>
                  <div className="field-value"><strong>{agent?.nom || '________'} {agent?.prenom || '________'}</strong></div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Prénom du père:</label>
                  <input type="text" className="input-line" style={{width:'100%'}} />
                </div>
                <div className="field">
                  <label>Nationalité:</label>
                  <div className="field-value">Tunisienne</div>
                </div>
                <div className="field">
                  <label>Sexe:</label>
                  <div className="field-value">Masculin ☐ Féminin ☐</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Date et lieu de naissance :</label>
                  <div className="inline-group">
                    <input type="text" maxLength="2" className="box-small" placeholder="jj" />
                    <input type="text" maxLength="2" className="box-small" placeholder="mm" />
                    <input type="text" maxLength="4" className="box-small" placeholder="aaaa" />
                    <input type="text" placeholder="lieu" className="input-line" style={{width:'150px'}} />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>N° C.I.N.</label>
                  <div>{[...Array(11)].map((_, i) => (<input key={i} type="text" maxLength="1" className="box" />))}</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Adresse du domicile :</label>
                  <input type="text" className="input-line" style={{width:'100%'}} />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Code Postal</label>
                  <div>{[...Array(11)].map((_, i) => (<input key={i} type="text" maxLength="1" className="box" />))}</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Date d'embauche:</label>
                  <div className="inline-group">
                    <input type="text" maxLength="2" className="box-small" placeholder="jj" />
                    <input type="text" maxLength="2" className="box-small" placeholder="mm" />
                    <input type="text" maxLength="4" className="box-small" placeholder="aaaa" />
                  </div>
                </div>
                <div className="field">
                  <label>Qualification professionnelle:</label>
                  <div className="field-value"><strong>CHAUFFEUR BUS</strong></div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Emploi Habituel:</label>
                  <div className="field-value">CHAUFFEUR BUS depuis : 23/08/2001</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Occupation au moment de l'accident:</label>
                  <div className="field-value">CHAUFFEUR BUS depuis: 23/08/2001</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Adresse du lieu de travail habituel:</label>
                  <div className="field-value">AGENCE ZHANA</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <div className="checkbox-group">
                    <label className="checkbox"><input type="checkbox" /> L'accident a-t-il d'autre victimes ? Oui</label>
                    <label className="checkbox"><input type="checkbox" defaultChecked /> Non</label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ACCIDENT */}
            <div className="section">
              <div className="section-title">ACCIDENT</div>
              
              <div className="row">
                <div className="field">
                  <label>Date et heure de l'accident :</label>
                  <div className="inline-group">
                    <input type="text" maxLength="2" className="box-small" defaultValue={accidentDate.day} placeholder="jj" />
                    <input type="text" maxLength="2" className="box-small" defaultValue={accidentDate.month} placeholder="mm" />
                    <input type="text" maxLength="4" className="box-small" defaultValue={accidentDate.year} placeholder="aaaa" />
                    <span style={{marginLeft:'10px'}}>à</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="hh" />
                    <span>h</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="mn" />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Horaire de travail de la victime le jour de l'accident :</label>
                  <div className="field-value">de 07:00 h à 13:30 min</div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Lieu de l'accident :</label>
                  <div className="field-value"><strong>{accident?.lieu_accident || '_________________________________'}</strong></div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Etablissement où s'est produit l'accident :</label>
                  <div className="checkbox-group">
                    <label className="checkbox"><input type="checkbox" /> Chantier</label>
                    <label className="checkbox"><input type="checkbox" /> Atelier</label>
                    <label className="checkbox"><input type="checkbox" /> Bureau</label>
                    <label className="checkbox"><input type="checkbox" defaultChecked /> Autre : Route Public</label>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Circonstance détaillée de l'accident :</label>
                  <textarea rows="3" className="textarea" defaultValue={accident?.condition_accident || ''} placeholder="Décrivez les circonstances..." />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Agents matériels provoquant l'accident :</label>
                  <input type="text" className="input-line" style={{width:'100%'}} />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Siège de lésion :</label>
                  <input type="text" className="input-line" style={{width:'100%'}} defaultValue={accident?.endroit_blessures || ''} />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Nature de lésion :</label>
                  <input type="text" className="input-line" style={{width:'100%'}} defaultValue={accident?.nature_blessures || ''} />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Lieu où a été transporté la victime :</label>
                  <div className="inline-group">
                    <input type="text" className="input-line" style={{width:'60%'}} placeholder="Hôpital" />
                    <span>A quelle heure ?</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="hh" />
                    <span>h</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="mn" />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Conséquence :</label>
                  <div className="checkbox-group">
                    <label className="checkbox"><input type="checkbox" /> SANS ARRET DE TRAVAIL</label>
                    <label className="checkbox"><input type="checkbox" defaultChecked /> AVEC ARRET DE TRAVAIL</label>
                    <label className="checkbox"><input type="checkbox" /> DECES</label>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>En cas d'arrêt de travail : Date et heure de l'arrêt de travail</label>
                  <div className="inline-group">
                    <input type="text" maxLength="2" className="box-small" placeholder="jj" />
                    <input type="text" maxLength="2" className="box-small" placeholder="mm" />
                    <input type="text" maxLength="4" className="box-small" placeholder="aaaa" />
                    <span>à</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="hh" />
                    <span>h</span>
                    <input type="text" maxLength="2" className="box-small" placeholder="mn" />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <label>Après le jour de l'accident, le salaire est-il maintenu ?</label>
                  <div className="checkbox-group">
                    <label className="checkbox"><input type="checkbox" defaultChecked /> oui</label>
                    <label className="checkbox"><input type="checkbox" /> non</label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* TEMOINS */}
            <div className="section">
              <div className="section-title">TEMOINS</div>
              
              <div className="row">
                <div className="field">
                  <label>Nom, Prénoms et adresses:</label>
                  <textarea rows="2" className="textarea" defaultValue={accident?.temoin1 ? `${accident.temoin1}\n${accident.temoin2 || ''}` : ''} />
                </div>
              </div>
              
              <div className="row">
                <div className="field">
                  <div className="inline-group">
                    <label className="checkbox"><input type="checkbox" /> A-t-il été dressé un P.V par la police ou par la garde nationale ?</label>
                    <span>son numéro :</span>
                    <input type="text" className="input-line" style={{width:'120px'}} />
                    <span>Date :</span>
                    <input type="text" className="input-line" style={{width:'100px'}} placeholder="jj/mm/aaaa" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* TIERS */}
            <div className="section">
              <div className="section-title">TIERS</div>
              
              <div className="row">
                <div className="field">
                  <div className="checkbox-group">
                    <label className="checkbox"><input type="checkbox" name="tiers_responsable" checked={formData.tiers_responsable} onChange={handleChange} /> L'accident a-t-il été causé par un tiers ? Oui</label>
                    <label className="checkbox"><input type="checkbox" checked={!formData.tiers_responsable} onChange={() => setFormData({...formData, tiers_responsable: false})} /> Non</label>
                  </div>
                </div>
              </div>
              
              {formData.tiers_responsable && (
                <>
                  <div className="row">
                    <div className="field">
                      <label>Nom et adresse du responsable :</label>
                      <input type="text" className="input-line" style={{width:'100%'}} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>Société d'assurance :</label>
                      <input type="text" className="input-line" style={{width:'100%'}} />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* DECLARATION */}
            <div className="declaration">
              <p>
                Je soussigné (nom et prénoms): <strong>
                  <input 
                    type="text" 
                    name="declarant_nom" 
                    value={formData.declarant_nom} 
                    onChange={handleChange}
                    className="input-line" 
                    style={{width:'250px', fontWeight:'bold'}} 
                    placeholder="NOM Prénom"
                  />
                </strong> déclare sur l'honneur,
                en ma qualité de détaché au Service Social de la SRTB que les renseignements ci-dessus sont sincères et véridiques.
              </p>
              
              <p className="subtitle" style={{marginTop:'10px'}}>
                <strong>Remarque:</strong> Cette déclaration doit être établie en trois exemplaires et transmise:
              </p>
              <ul>
                <li>A la Caisse Nationale de Sécurité Sociale.</li>
                <li>Au poste de police ou de la garde nationale le plus proche du lieu de travail de la victime.</li>
                <li>A l'inspection du travail territorialement compétente.</li>
              </ul>
              
              <div className="signature">
                <div>
                  Fait à <input type="text" name="lieu_declaration" value={formData.lieu_declaration} onChange={handleChange} className="input-line" style={{width:'100px'}} />
                  , le <input type="text" name="date_declaration" value={formData.date_declaration} onChange={handleChange} className="input-line" style={{width:'120px'}} />
                </div>
                <div className="signature-line">
                  Signature et cachet de l'entreprise<br />
                  <span className="line" style={{width:'200px'}}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="modal-footer no-print">
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn-info" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            <Save size={16} /> {loading ? 'Confirmation...' : 'Confirmer la déclaration'}
          </button>
        </div>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-container {
          width: 1100px;
          max-width: 95vw;
          max-height: 90vh;
          background: white;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #1e3a8a;
          color: white;
        }
        .modal-header h2 { margin: 0; font-size: 18px; }
        .modal-close { background: none; border: none; color: white; cursor: pointer; font-size: 20px; }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px; background: #e8e8e8; }
        .document { background: white; padding: 25px; max-width: 1000px; margin: 0 auto; font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 15px 20px; border-top: 1px solid #ddd; background: white; }
        .btn-secondary { padding: 8px 16px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; }
        .btn-info { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-primary { padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        @media print {
          .no-print { display: none !important; }
          .modal-overlay { position: static; background: white; }
          .modal-container { width: 100%; max-height: none; }
          .modal-body { padding: 0; background: white; }
          .document { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

export default CnamDeclarationModal; 