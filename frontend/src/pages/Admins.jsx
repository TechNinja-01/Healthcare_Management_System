import { useCallback, useEffect, useState } from "react";

import Alert from "../components/Alert";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import DashboardLayout from "../layout/DashboardLayout";
import { registerAdmin } from "../api/authApi";
import { deleteAdmin, getAdmins, updateAdmin } from "../api/adminApi";
import { usePermissions } from "../hooks/usePermissions";
import { getApiData, getApiMessage, getErrorMessage } from "../utils/apiHelpers";

const emptyCreateForm = {
  // id: "",
  username: "",
  email: "",
  password: "",
  admin_id: "",
  name: "",
  phone: "",
  designation: "",
};

const emptyEditForm = {
  name: "",
  email: "",
  phone: "",
  designation: "",
};

export default function Admins() {
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission("admin.create");
  const canUpdate = hasPermission("admin.update");
  const canDelete = hasPermission("admin.delete");

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAdmins();
      setAdmins(getApiData(response) || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch admins"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateChange = (e) => {
    setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      designation: admin.designation || "",
    });
    setShowEditModal(true);
    setError("");
    setSuccess("");
  };

  const openViewModal = (admin) => {
    setSelectedAdmin(admin);
    setShowViewModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(emptyCreateForm);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedAdmin(null);
    setEditForm(emptyEditForm);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await registerAdmin(createForm);
      setSuccess("Admin created successfully");
      closeCreateModal();
      await fetchAdmins();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create admin"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateAdmin(selectedAdmin.id, editForm);
      setSuccess(getApiMessage(response, "Admin updated successfully"));
      closeEditModal();
      await fetchAdmins();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update admin"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (admin) => {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete admin "${admin.name}" (${admin.id})?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await deleteAdmin(admin.id);
      setSuccess("Admin deleted successfully");
      await fetchAdmins();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete admin"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="text-left">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admins</h1>
            <p className="text-gray-500 mt-1">Manage administrator accounts</p>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setError("");
                setSuccess("");
              }}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold transition disabled:opacity-60"
            >
              + Add Admin
            </button>
          )}
        </div>

        <Alert type="error" message={error} onClose={() => setError("")} />
        <Alert type="success" message={success} onClose={() => setSuccess("")} />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading admins...</div>
          ) : admins.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No admins found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {/* <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Admin ID</th> */}
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Designation</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      {/* <td className="px-6 py-4 font-medium">{admin.id}</td> */}
                      <td className="px-6 py-4">{admin.name}</td>
                      <td className="px-6 py-4">{admin.email}</td>
                      <td className="px-6 py-4">{admin.designation}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          type="button"
                          onClick={() => openViewModal(admin)}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          View
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditModal(admin)}
                            disabled={submitting}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(admin)}
                            disabled={submitting}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-60"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={showCreateModal} title="Add Admin" onClose={closeCreateModal} wide>
          <p className="text-sm text-gray-500 mb-4">
            Creates a login account and admin profile together.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <FormField label="User ID" name="id" value={createForm.id} onChange={handleCreateChange} required />
              <FormField label="Admin ID" name="admin_id" value={createForm.admin_id} onChange={handleCreateChange} required /> */}
              <FormField label="Username" name="username" value={createForm.username} onChange={handleCreateChange} required />
              <FormField label="Email" name="email" type="email" value={createForm.email} onChange={handleCreateChange} required />
              <FormField label="Password" name="password" type="password" value={createForm.password} onChange={handleCreateChange} required />
              <FormField label="Full Name" name="name" value={createForm.name} onChange={handleCreateChange} required />
              <FormField label="Phone" name="phone" value={createForm.phone} onChange={handleCreateChange} required />
              <FormField label="Designation" name="designation" value={createForm.designation} onChange={handleCreateChange} required />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeCreateModal} className="px-4 py-2 rounded-lg border">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                {submitting ? "Adding..." : "Add Admin"}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showEditModal} title="Edit Admin" onClose={closeEditModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Full Name" name="name" value={editForm.name} onChange={handleEditChange} required />
            <FormField label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} required />
            <FormField label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} required />
            <FormField label="Designation" name="designation" value={editForm.designation} onChange={handleEditChange} required />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-lg border">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                {submitting ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showViewModal} title="Admin Details" onClose={() => setShowViewModal(false)}>
          {selectedAdmin && (
            <div className="space-y-3 text-sm">
              {/* <p><span className="text-gray-500">Admin ID:</span> {selectedAdmin.id}</p>
              <p><span className="text-gray-500">User ID:</span> {selectedAdmin.user_id}</p> */}
              <p><span className="text-gray-500">Name:</span> {selectedAdmin.name}</p>
              <p><span className="text-gray-500">Email:</span> {selectedAdmin.email}</p>
              <p><span className="text-gray-500">Phone:</span> {selectedAdmin.phone}</p>
              <p><span className="text-gray-500">Designation:</span> {selectedAdmin.designation}</p>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
