import React, { useState, useEffect } from 'react';
import {
  Container,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ApplicationDetails from '../components/ApplicationDetails';

const EvacuationRequests = () => {
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
      const response = await axios.get('http://localhost:5000/api/evacuation-applications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Detailed logging of API response
      console.log('Full API Response:', JSON.stringify(response.data, null, 2));
      
      // Check if we have any applications
      if (response.data && response.data.length > 0) {
        const firstApp = response.data[0];
        console.log('First application structure:', Object.keys(firstApp));
        console.log('File fields in first application:', {
          nufus_cuzdani: {
            exists: 'nufus_cuzdani_data' in firstApp,
            value: firstApp.nufus_cuzdani_data,
            type: typeof firstApp.nufus_cuzdani_data
          },
          mulkiyet_belgesi: {
            exists: 'mulkiyet_belgesi_data' in firstApp,
            value: firstApp.mulkiyet_belgesi_data,
            type: typeof firstApp.mulkiyet_belgesi_data
          }
        });
      }

      setApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      setError('Başvurular yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleViewDetails = (application) => {
    console.log('Selected application structure:', Object.keys(application));
    console.log('File fields in selected application:', {
      nufus_cuzdani: {
        exists: 'nufus_cuzdani_data' in application,
        value: application.nufus_cuzdani_data,
        type: typeof application.nufus_cuzdani_data
      },
      mulkiyet_belgesi: {
        exists: 'mulkiyet_belgesi_data' in application,
        value: application.mulkiyet_belgesi_data,
        type: typeof application.mulkiyet_belgesi_data
      }
    });
    setSelectedApplication(application);
    setDetailsOpen(true);
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
        app.id === applicationId ? { ...app, status: newStatus } : app
      );
      setApplications(updatedApplications);

      if (selectedApplication && selectedApplication.id === applicationId) {
        setSelectedApplication(prev => ({ ...prev, status: newStatus }));
      }

      const response = await axios.put(
        `http://localhost:5000/api/evacuation-applications/${applicationId}/status`,
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
        app.id === applicationId ? response.data : app
      ));

      if (selectedApplication && selectedApplication.id === applicationId) {
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
      if (selectedApplication && selectedApplication.id === applicationId) {
        setSelectedApplication(prev => ({ ...prev, status: oldApplications.find(app => app.id === applicationId)?.status }));
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
      
      console.log('Fetching document:', { applicationId, documentType });
      
      const response = await axios.get(
        `http://localhost:5000/api/evacuation-applications/${applicationId}/files/${documentType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob'
        }
      );

      console.log('Document response:', {
        status: response.status,
        headers: response.headers,
        dataSize: response.data.size,
        dataType: response.data.type
      });

      // Check if we received valid data
      if (response.data.size === 0) {
        throw new Error('Dosya boş veya geçersiz');
      }

      // Create a blob URL and open in new window
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error fetching document:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      setError('Belge görüntülenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      setTimeout(() => {
        setError(null);
      }, 3000);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tahliye Başvuruları
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Başvuru No</TableCell>
              <TableCell>Başvuru Tarihi</TableCell>
              <TableCell>Başvuran</TableCell>
              <TableCell>TCKN</TableCell>
              <TableCell>Adres</TableCell>
              <TableCell>Tahliye Tarihi</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.id}</TableCell>
                <TableCell>{formatDate(application.created_at)}</TableCell>
                <TableCell>{application.full_name}</TableCell>
                <TableCell>{application.tckn}</TableCell>
                <TableCell>{application.address}</TableCell>
                <TableCell>{formatDate(application.evacuation_date)}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={application.status || 'pending'}
                      onChange={(e) => handleStatusChange(application.id, e.target.value)}
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
                      <Typography variant="body1">{selectedApplication.id}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Başvuru Tarihi</Typography>
                      <Typography variant="body1">{formatDate(selectedApplication.created_at)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Başvuran Adı Soyadı</Typography>
                      <Typography variant="body1">{selectedApplication.full_name}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">TCKN</Typography>
                      <Typography variant="body1">{selectedApplication.tckn}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Adres</Typography>
                      <Typography variant="body1">{selectedApplication.address}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Telefon</Typography>
                      <Typography variant="body1">{selectedApplication.phone_number}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">E-posta</Typography>
                      <Typography variant="body1">{selectedApplication.email}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Tahliye Tarihi</Typography>
                      <Typography variant="body1">{formatDate(selectedApplication.evacuation_date)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Tahliye Nedeni</Typography>
                      <Typography variant="body1">{selectedApplication.evacuation_reason}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Tesisat Numarası</Typography>
                      <Typography variant="body1">{selectedApplication.tesisat_numarasi}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">DASK Poliçe Numarası</Typography>
                      <Typography variant="body1">{selectedApplication.dask_police_numarasi}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Zorunlu Deprem Sigortası</Typography>
                      <Typography variant="body1">{selectedApplication.zorunlu_deprem_sigortasi ? 'Var' : 'Yok'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">IBAN</Typography>
                      <Typography variant="body1">{selectedApplication.iban}</Typography>
                    </Grid>
                    {selectedApplication.landlord_type && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Mülk Sahibi Tipi</Typography>
                          <Typography variant="body1">{selectedApplication.landlord_type}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Mülk Sahibi Ad Soyad</Typography>
                          <Typography variant="body1">{selectedApplication.mulk_sahibi_ad_soyad}</Typography>
                        </Grid>
                        {selectedApplication.landlord_type === 'tuzel' && (
                          <>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2">Vergi Numarası</Typography>
                              <Typography variant="body1">{selectedApplication.vergi_numarasi}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2">Tüzel Kişi Ad</Typography>
                              <Typography variant="body1">{selectedApplication.tuzel_kisi_ad}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2">Tüzel Kişi Soyad</Typography>
                              <Typography variant="body1">{selectedApplication.tuzel_kisi_soyad}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2">Ünvan</Typography>
                              <Typography variant="body1">{selectedApplication.unvan}</Typography>
                            </Grid>
                          </>
                        )}
                      </>
                    )}
                  </Grid>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Nüfus Cüzdanı</Typography>
                      {console.log('Checking nufus cuzdani data:', {
                        exists: 'nufus_cuzdani_data' in selectedApplication,
                        hasData: Boolean(selectedApplication?.nufus_cuzdani_data),
                        dataType: typeof selectedApplication?.nufus_cuzdani_data,
                        value: selectedApplication?.nufus_cuzdani_data
                      })}
                      {selectedApplication?.nufus_cuzdani_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.id, 'nufus_cuzdani')}
                          disabled={documentLoading}
                          startIcon={documentLoading ? <CircularProgress size={20} /> : null}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1" color="text.secondary">Dosya yüklenmemiş</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Mülkiyet Belgesi</Typography>
                      {console.log('Checking mulkiyet belgesi data:', {
                        exists: 'mulkiyet_belgesi_data' in selectedApplication,
                        hasData: Boolean(selectedApplication?.mulkiyet_belgesi_data),
                        dataType: typeof selectedApplication?.mulkiyet_belgesi_data,
                        value: selectedApplication?.mulkiyet_belgesi_data
                      })}
                      {selectedApplication?.mulkiyet_belgesi_data ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleViewDocument(selectedApplication.id, 'mulkiyet_belgesi')}
                          disabled={documentLoading}
                          startIcon={documentLoading ? <CircularProgress size={20} /> : null}
                        >
                          {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                        </Button>
                      ) : (
                        <Typography variant="body1" color="text.secondary">Dosya yüklenmemiş</Typography>
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
    </Container>
  );
};

export default EvacuationRequests; 