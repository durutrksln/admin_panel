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
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
// We might need a different details component or modify this one
import ApplicationDetails from '../components/ApplicationDetails';

const NewConnectionApplications = () => {
  const [connectionApplications, setConnectionApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConnectionApplication, setSelectedConnectionApplication] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);

  useEffect(() => {
    fetchConnectionApplications();
  }, []);

  const fetchConnectionApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/connection-applications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setConnectionApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching connection applications:', error);
      setError('Bağlantı Başvuruları yüklenirken bir hata oluştu.');
      setLoading(false);
      showSnackbar(error.response?.data?.message || 'Bağlantı Başvuruları yüklenirken bir hata oluştu.', 'error');
    }
  };

  const handleViewDetails = async (application) => {
    setDetailsLoading(true); // Start loading details
    setDetailsOpen(true);
    setActiveTab(0); // Reset tab to the first one
    try {
        const token = localStorage.getItem('token');
         const response = await axios.get(`http://localhost:5000/api/connection-applications/${application.id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
         });
         setSelectedConnectionApplication(response.data);
         setDetailsLoading(false);
    } catch (error) {
        console.error('Error fetching connection application details:', error);
        setDetailsLoading(false);
        setSelectedConnectionApplication(null); // Clear selected application on error
        showSnackbar(error.response?.data?.message || 'Başvuru detayları yüklenirken bir hata oluştu.', 'error');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    const oldConnectionApplications = [...connectionApplications];
    
    try {
      setStatusUpdateLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Updating connection application status:', { applicationId, newStatus });
      
      const updatedConnectionApplications = connectionApplications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      );
      setConnectionApplications(updatedConnectionApplications);

      if (selectedConnectionApplication && selectedConnectionApplication.id === applicationId) {
        setSelectedConnectionApplication(prev => ({ ...prev, status: newStatus }));
      }

      const response = await axios.put(
        `http://localhost:5000/api/connection-applications/${applicationId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('Update response:', response.data);

      setConnectionApplications(connectionApplications.map(app => 
        app.id === applicationId ? response.data : app
      ));

      if (selectedConnectionApplication && selectedConnectionApplication.id === applicationId) {
        setSelectedConnectionApplication(response.data);
      }

      setStatusUpdateLoading(false);
      showSnackbar('Durum başarıyla güncellendi.', 'success');
    } catch (error) {
      console.error('Error updating connection application status:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      setConnectionApplications(oldConnectionApplications);
      if (selectedConnectionApplication && selectedConnectionApplication.id === applicationId) {
        setSelectedConnectionApplication(prev => ({ ...prev, status: oldConnectionApplications.find(app => app.id === applicationId)?.status }));
      }

      setStatusUpdateLoading(false);
      showSnackbar(error.response?.data?.message || 'Durum güncellenirken bir hata oluştu.', 'error');
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
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: tr });
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return 'Geçersiz Tarih';
    }
  };

   const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleViewDocument = async (applicationId, documentType) => {
    try {
      setDocumentLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/connection-applications/${applicationId}/files/${documentType}`,
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
      showSnackbar('Belge görüntülenirken bir hata oluştu.', 'error');
    } finally {
      setDocumentLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !connectionApplications.length) { // Only show error if no data could be loaded
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Yeni Bağlantı Başvuruları
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Başvuru No</TableCell>
              <TableCell>Başvuru Tarihi</TableCell>
              <TableCell>Başvuran</TableCell>
              <TableCell>TCKN</TableCell>
              <TableCell>Lisans Gerekiyor</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connectionApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.id}</TableCell>
                <TableCell>{formatDate(application.created_at)}</TableCell>
                <TableCell>{application.full_name}</TableCell>
                <TableCell>{application.tckn}</TableCell>
                <TableCell>{application.requires_license ? 'Evet' : 'Hayır'}</TableCell>
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
        {/* Show loading spinner if details are being fetched */}
        {detailsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        ) : (
        selectedConnectionApplication && (
          <>
            <DialogTitle>Bağlantı Başvurusu Detayları - #{selectedConnectionApplication.id}</DialogTitle>
            <DialogContent dividers>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="connection application details tabs">
                <Tab label="Genel Bilgiler" />
                <Tab label="Başvuran Bilgileri" />
                <Tab label="Evraklar" />
              </Tabs>
              {activeTab === 0 && (
                <Box sx={{ p: 3 }}>
                   <Typography variant="h6" gutterBottom>Genel Bilgiler</Typography>
                   <Grid container spacing={2}>
                       <Grid item xs={12} sm={6}><Typography variant="subtitle2">Başvuru No:</Typography><Typography variant="body1">{selectedConnectionApplication.id}</Typography></Grid>
                       <Grid item xs={12} sm={6}><Typography variant="subtitle2">Başvuru Tarihi:</Typography><Typography variant="body1">{formatDate(selectedConnectionApplication.created_at)}</Typography></Grid>
                       <Grid item xs={12} sm={6}><Typography variant="subtitle2">Durum:</Typography><Typography variant="body1">{getStatusLabel(selectedConnectionApplication.status)}</Typography></Grid>
                       <Grid item xs={12} sm={6}><Typography variant="subtitle2">Lisans Gerekiyor:</Typography><Typography variant="body1">{selectedConnectionApplication.requires_license ? 'Evet' : 'Hayır'}</Typography></Grid>
                       <Grid item xs={12} sm={6}><Typography variant="subtitle2">Son Güncelleme:</Typography><Typography variant="body1">{formatDate(selectedConnectionApplication.updated_at)}</Typography></Grid>
                   </Grid>
                </Box>
              )}
              {activeTab === 1 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Başvuran Bilgileri</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><Typography variant="subtitle2">Ad Soyad:</Typography><Typography variant="body1">{selectedConnectionApplication.full_name}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography variant="subtitle2">TCKN:</Typography><Typography variant="body1">{selectedConnectionApplication.tckn}</Typography></Grid>
                    </Grid>
                </Box>
              )}
              {activeTab === 2 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Evraklar</Typography>
                    <Grid container spacing={2}>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">Tapu Belgesi:</Typography>
                             {selectedConnectionApplication.deed_file_data ? (
                                  <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={() => handleViewDocument(selectedConnectionApplication.id, 'deed')}
                                    disabled={documentLoading}
                                  >
                                    {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                  </Button>
                             ) : (
                                  <Typography variant="body1">Yüklenmedi</Typography>
                             )}
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">Elektrik Projesi:</Typography>
                              {selectedConnectionApplication.electrical_project_data ? (
                                   <Button 
                                     variant="contained" 
                                     color="primary" 
                                     onClick={() => handleViewDocument(selectedConnectionApplication.id, 'electrical_project')}
                                     disabled={documentLoading}
                                   >
                                     {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                   </Button>
                              ) : (
                                   <Typography variant="body1">Yüklenmedi</Typography>
                              )}
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">Yapı Ruhsatı:</Typography>
                              {selectedConnectionApplication.building_permit_data ? (
                                   <Button 
                                     variant="contained" 
                                     color="primary" 
                                     onClick={() => handleViewDocument(selectedConnectionApplication.id, 'building_permit')}
                                     disabled={documentLoading}
                                   >
                                     {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                   </Button>
                              ) : (
                                   <Typography variant="body1">Yüklenmedi</Typography>
                              )}
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">İzin Belgesi:</Typography>
                              {selectedConnectionApplication.permit_document_data ? (
                                   <Button 
                                     variant="contained" 
                                     color="primary" 
                                     onClick={() => handleViewDocument(selectedConnectionApplication.id, 'permit')}
                                     disabled={documentLoading}
                                   >
                                     {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                   </Button>
                              ) : (
                                   <Typography variant="body1">Yüklenmedi</Typography>
                              )}
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">6292 Sayılı Kanun Belgesi:</Typography>
                              {selectedConnectionApplication.law_6292_data ? (
                                   <Button 
                                     variant="contained" 
                                     color="primary" 
                                     onClick={() => handleViewDocument(selectedConnectionApplication.id, 'law_6292')}
                                     disabled={documentLoading}
                                   >
                                     {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                   </Button>
                              ) : (
                                   <Typography variant="body1">Yüklenmedi</Typography>
                              )}
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Typography variant="subtitle2">3194 Sayılı Kanun Belgesi:</Typography>
                              {selectedConnectionApplication.law_3194_data ? (
                                   <Button 
                                     variant="contained" 
                                     color="primary" 
                                     onClick={() => handleViewDocument(selectedConnectionApplication.id, 'law_3194')}
                                     disabled={documentLoading}
                                   >
                                     {documentLoading ? 'Yükleniyor...' : 'Görüntüle'}
                                   </Button>
                              ) : (
                                   <Typography variant="body1">Yüklenmedi</Typography>
                              )}
                         </Grid>
                    </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)} color="primary">
                Kapat
              </Button>
            </DialogActions>
          </>
        ))}
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default NewConnectionApplications; 