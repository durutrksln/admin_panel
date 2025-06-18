import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ApplicationDetails from '../components/ApplicationDetails';

const NewSubscriptions = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/applications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Başvurular yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleViewDetails = async (application) => {
    setDetailsOpen(true);
    setActiveTab(0);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/applications/${application.application_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSelectedApplication(response.data);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setError('Başvuru detayları yüklenirken bir hata oluştu.');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    // Store the old state before making any changes
    const oldApplications = [...applications];
    
    try {
      setStatusUpdateLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Updating status:', { applicationId, newStatus, token }); // Debug log
      
      // Optimistic update
      const updatedApplications = applications.map(app => 
        app.application_id === applicationId ? { ...app, status: newStatus } : app
      );
      setApplications(updatedApplications);

      if (selectedApplication && selectedApplication.application_id === applicationId) {
        setSelectedApplication(prev => ({ ...prev, status: newStatus }));
      }

      const response = await axios.put(
        `http://localhost:5000/api/applications/${applicationId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('Update response:', response.data); // Debug log

      // Update with server response
      setApplications(applications.map(app => 
        app.application_id === applicationId ? response.data : app
      ));

      if (selectedApplication && selectedApplication.application_id === applicationId) {
        setSelectedApplication(response.data);
      }

      setStatusUpdateLoading(false);
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      }); // Debug log
      
      // Revert optimistic update on error
      setApplications(oldApplications);
      if (selectedApplication && selectedApplication.application_id === applicationId) {
        setSelectedApplication(prev => ({ ...prev, status: oldApplications.find(app => app.application_id === applicationId)?.status }));
      }

      setError(error.response?.data?.message || 'Durum güncellenirken bir hata oluştu.');
      setStatusUpdateLoading(false);

      // Show error message for 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const handleViewDocument = async (applicationId, documentType) => {
    try {
      setDocumentLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/applications/${applicationId}/files/${documentType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob'
        }
      );

      // Create a blob URL and open in new window
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Belge görüntülenirken bir hata oluştu.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_review':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'in_review':
        return 'İnceleniyor';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: tr });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Yeni Abonelik Başvuruları
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Başvuru No</TableCell>
              <TableCell>Başvuru Tarihi</TableCell>
              <TableCell>Başvuran</TableCell>
              <TableCell>Adres</TableCell>
              <TableCell>Tesisat No</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.application_id}>
                <TableCell>{application.application_id}</TableCell>
                <TableCell>{formatDate(application.submitted_at)}</TableCell>
                <TableCell>{application.applicant_name}</TableCell>
                <TableCell>{application.property_address}</TableCell>
                <TableCell>{application.installation_number}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={application.status || 'pending'}
                      onChange={(e) => handleStatusChange(application.application_id, e.target.value)}
                      disabled={statusUpdateLoading}
                      sx={{
                        '& .MuiSelect-select': {
                          py: 0.5,
                        },
                      }}
                    >
                      <MenuItem value="pending">Beklemede</MenuItem>
                      <MenuItem value="in_review">İnceleniyor</MenuItem>
                      <MenuItem value="approved">Onaylandı</MenuItem>
                      <MenuItem value="rejected">Reddedildi</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleViewDetails(application)}
                  >
                    Detaylar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedApplication && (
          <>
            <DialogTitle>Başvuru Detayları</DialogTitle>
            <DialogContent>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="Genel Bilgiler" />
                <Tab label="Dosyalar" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Başvuru No</Typography>
                      <Typography variant="body1">{selectedApplication.application_id}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Başvuru Tarihi</Typography>
                      <Typography variant="body1">{formatDate(selectedApplication.submitted_at)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Başvuran Adı</Typography>
                      <Typography variant="body1">{selectedApplication.applicant_name}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Kimlik Belgesi Tipi</Typography>
                      <Typography variant="body1">{selectedApplication.applicant_id_document_type}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Adres</Typography>
                      <Typography variant="body1">{selectedApplication.property_address}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Tesisat Numarası</Typography>
                      <Typography variant="body1">{selectedApplication.installation_number || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">DASK Poliçe No</Typography>
                      <Typography variant="body1">{selectedApplication.dask_policy_number || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Kiracı mı?</Typography>
                      <Typography variant="body1">{selectedApplication.is_tenant ? 'Evet' : 'Hayır'}</Typography>
                    </Grid>
                    {selectedApplication.is_tenant && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Ev Sahibi Adı</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_full_name}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Ev Sahibi Kimlik Tipi</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_id_type}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Ev Sahibi Kimlik No</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_id_number}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Şirket Adı</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_company_name || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Temsilci Adı</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_representative_name || '-'}</Typography>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Vekaletname Verildi mi?</Typography>
                      <Typography variant="body1">{selectedApplication.power_of_attorney_provided ? 'Evet' : 'Hayır'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">İmza Sirküleri Verildi mi?</Typography>
                      <Typography variant="body1">{selectedApplication.signature_circular_provided ? 'Evet' : 'Hayır'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Sonlandırma IBAN</Typography>
                      <Typography variant="body1">{selectedApplication.termination_iban || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Mülkiyet Belgesi Tipi</Typography>
                      <Typography variant="body1">{selectedApplication.ownership_document_type || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Notlar</Typography>
                      <Typography variant="body1">{selectedApplication.notes || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Eski Fatura</Typography>
                      {selectedApplication.old_bill_file_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.application_id, 'old_bill')}
                          disabled={documentLoading}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1">Dosya yüklenmemiş</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Vekaletname</Typography>
                      {selectedApplication.proxy_document_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.application_id, 'proxy')}
                          disabled={documentLoading}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1">Dosya yüklenmemiş</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">DASK Poliçesi</Typography>
                      {selectedApplication.dask_policy_file_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.application_id, 'dask')}
                          disabled={documentLoading}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1">Dosya yüklenmemiş</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Mülkiyet Belgesi</Typography>
                      {selectedApplication.ownership_document_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.application_id, 'ownership')}
                          disabled={documentLoading}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1">Dosya yüklenmemiş</Typography>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Kapat</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default NewSubscriptions; 