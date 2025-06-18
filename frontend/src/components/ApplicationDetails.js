import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import axios from 'axios';

const ApplicationDetails = ({ open, onClose, applicationId }) => {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (open && applicationId) {
      fetchApplicationDetails();
    }
  }, [open, applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/applications/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setApplication(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setError('Başvuru detayları yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPdfUrl(null);
  };

  const handleViewFile = async (fileType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/applications/${applicationId}/files/${fileType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(url);
    } catch (error) {
      console.error('Error fetching file:', error);
      setError('Dosya yüklenirken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Typography color="error">{error}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Kapat</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Başvuru Detayları</DialogTitle>
      <DialogContent>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Genel Bilgiler" />
          <Tab label="Dosyalar" />
        </Tabs>

        {activeTab === 0 && application && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Başvuru No</Typography>
                <Typography variant="body1">{application.application_id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Başvuru Tarihi</Typography>
                <Typography variant="body1">{new Date(application.submitted_at).toLocaleString('tr-TR')}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Başvuran</Typography>
                <Typography variant="body1">{application.applicant_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Kimlik Tipi</Typography>
                <Typography variant="body1">{application.applicant_id_document_type}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Adres</Typography>
                <Typography variant="body1">{application.property_address}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Kurulum Numarası</Typography>
                <Typography variant="body1">{application.installation_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">DASK Poliçe No</Typography>
                <Typography variant="body1">{application.dask_policy_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Kiracı mı?</Typography>
                <Typography variant="body1">{application.is_tenant ? 'Evet' : 'Hayır'}</Typography>
              </Grid>
              {application.is_tenant && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Ev Sahibi Adı</Typography>
                    <Typography variant="body1">{application.landlord_full_name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Ev Sahibi Kimlik Tipi</Typography>
                    <Typography variant="body1">{application.landlord_id_type}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Ev Sahibi Kimlik No</Typography>
                    <Typography variant="body1">{application.landlord_id_number}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Şirket Adı</Typography>
                    <Typography variant="body1">{application.landlord_company_name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Temsilci Adı</Typography>
                    <Typography variant="body1">{application.landlord_representative_name || '-'}</Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Vekaletname Verildi mi?</Typography>
                <Typography variant="body1">{application.power_of_attorney_provided ? 'Evet' : 'Hayır'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">İmza Sirküleri Verildi mi?</Typography>
                <Typography variant="body1">{application.signature_circular_provided ? 'Evet' : 'Hayır'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Sonlandırma IBAN</Typography>
                <Typography variant="body1">{application.termination_iban || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Mülkiyet Belgesi Tipi</Typography>
                <Typography variant="body1">{application.ownership_document_type || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Notlar</Typography>
                <Typography variant="body1">{application.notes || '-'}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Eski Fatura</Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleViewFile('old_bill')}
                    disabled={!application?.old_bill_file_data}
                  >
                    Görüntüle
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Vekaletname</Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleViewFile('proxy')}
                    disabled={!application?.proxy_document_data}
                  >
                    Görüntüle
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>DASK Poliçesi</Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleViewFile('dask')}
                    disabled={!application?.dask_policy_file_data}
                  >
                    Görüntüle
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Mülkiyet Belgesi</Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleViewFile('ownership')}
                    disabled={!application?.ownership_document_data}
                  >
                    Görüntüle
                  </Button>
                </Paper>
              </Grid>
            </Grid>

            {pdfUrl && (
              <Box sx={{ mt: 2 }}>
                <iframe
                  src={pdfUrl}
                  style={{ width: '100%', height: '500px', border: 'none' }}
                  title="PDF Viewer"
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationDetails; 