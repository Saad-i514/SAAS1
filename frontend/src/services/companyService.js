import api from './api';

export const getCompanies = async () => {
    const response = await api.get('/companies/');
    return response.data;
};

export const createCompanyAdmin = async (data) => {
    const response = await api.post('/users/company-admin', data);
    return response.data;
};

export const deleteCompany = async (id) => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
};
