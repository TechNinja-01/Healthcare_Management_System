import { useCallback, useEffect, useState } from "react";

import Alert from "../components/Alert";
import Button from "../components/Button";
import FormField from "../components/FormField";
import FormSection from "../components/FormSection";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import DashboardLayout from "../layout/DashboardLayout";
import { registerPatient } from "../api/authApi";
import { getDoctors } from "../api/doctorApi";
import { deletePatient, getPatients, updatePatient } from "../api/patientApi";
import { usePermissions } from "../hooks/usePermissions";
import { getApiData, getApiMessage, getErrorMessage } from "../utils/apiHelpers";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];

const emptyCreateForm = {
  // id: "",
  username: "",
  email: "",
  password: "",
  // patient_id: "",
  first_name: "",
  last_name: "",
  age: "",
  gender: "Male",
  phone: "",
  blood_group: "",
  address: "",
  disease: "",
  // assigned_doctor_id: "",
};

const emptyEditForm = {
  first_name: "",
  last_name: "",
  age: "",
  gender: "Male",
  email: "",
  phone: "",
  blood_group: "",
  address: "",
  disease: "",
  // doctor_id: "",
};

export default function Patients() {
  const { hasPermission, user } = usePermissions();

  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";
  const isPatientRole = user?.role === "patient";
  const doctorProfileId = user?.profile?.id || "";

  const canCreate = hasPermission("patient.create");
  const canUpdate = hasPermission("patient.update");
  const canDelete = hasPermission("patient.delete");
  const canRead = hasPermission("patient.read");

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const doctorOptions = [
    { value: "", label: "None" },
    ...doctors.map((d) => ({ value: d.id, label: `${d.name} (${d.id})` })),
  ];

  const fetchPatients = useCallback(async () => {
    if (!canRead) return;

    try {
      setLoading(true);
      setError("");
      const response = await getPatients();
      setPatients(getApiData(response) || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch patients"));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const fetchDoctors = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await getDoctors();
      setDoctors(getApiData(response) || []);
    } catch {
      setDoctors([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, [fetchPatients, fetchDoctors]);

  const handleCreateChange = (e) => {
    setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setShowCreateModal(true);
    setError("");
    setSuccess("");
  };

  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    setEditForm({
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
      age: String(patient.age ?? ""),
      gender: patient.gender || "Male",
      email: patient.email || "",
      phone: patient.phone || "",
      blood_group: patient.blood_group || "",
      address: patient.address || "",
      disease: patient.disease || "",
      // doctor_id: patient.doctor_id || "",
    });
    setShowEditModal(true);
    setError("");
    setSuccess("");
  };

  const openViewModal = (patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(emptyCreateForm);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedPatient(null);
    setEditForm(emptyEditForm);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const assignedDoctorId = isDoctor
        ? doctorProfileId
        : createForm.assigned_doctor_id || null;

      await registerPatient({
        // id: createForm.id,
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        patient_id: createForm.patient_id,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        age: Number(createForm.age),
        gender: createForm.gender,
        phone: createForm.phone,
        blood_group: createForm.blood_group,
        address: createForm.address,
        disease: createForm.disease,
        assigned_doctor_id: assignedDoctorId,
      });

      setSuccess("Patient created successfully");
      closeCreateModal();
      await fetchPatients();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create patient"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        age: Number(editForm.age),
        gender: editForm.gender,
        email: editForm.email,
        phone: editForm.phone,
        blood_group: editForm.blood_group,
        address: editForm.address,
        disease: editForm.disease,
      };

      if (isAdmin) {
        payload.doctor_id = editForm.doctor_id || null;
      }

      const response = await updatePatient(selectedPatient.id, payload);
      setSuccess(getApiMessage(response, "Patient updated successfully"));
      closeEditModal();
      await fetchPatients();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update patient"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (patient) => {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete patient "${patient.first_name} ${patient.last_name}" (${patient.id})?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await deletePatient(patient.id);
      setSuccess("Patient deleted successfully");
      await fetchPatients();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete patient"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canRead) {
    return (
      <DashboardLayout>
        <Alert type="error" message="You don't have permission to view patients." />
      </DashboardLayout>
    );
  }

  const pageSubtitle = isPatientRole
    ? "Your medical profile and assigned doctor"
    : isDoctor
      ? "Patients assigned to you"
      : "Manage all patient records";

  return (
    <DashboardLayout>
      <div className="text-left">
        <PageHeader
          title={isPatientRole ? "My Profile" : "Patients"}
          subtitle={pageSubtitle}
          action={
            canCreate && !isPatientRole ? (
              <Button onClick={openCreateModal} disabled={submitting}>
                + Add Patient
              </Button>
            ) : null
          }
        />

        <Alert type="error" message={error} onClose={() => setError("")} />
        <Alert type="success" message={success} onClose={() => setSuccess("")} />

        <div className="data-table-wrap">
          {loading ? (
            <div className="p-10 text-center" style={{ color: "var(--color-text-secondary)" }}>
              Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--color-text-secondary)" }}>
              {isDoctor ? "No patients assigned to you yet." : "No patients found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {/* <th>Patient ID</th> */}
                    <th>Name</th>
                    <th>Age</th>
                    <th>Disease</th>
                    {/* {!isPatientRole && !isDoctor && <th>Doctor</th>} */}
                    <th className="text-right ">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      {/* <td className="font-medium">{patient.id}</td> */}
                      <td>
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td>{patient.age}</td>
                      <td>{patient.disease}</td>
                      {/* {!isPatientRole && !isDoctor && (
                        <td>{patient.doctor_id || "None"}</td>
                      )} */}
                      <td className="text-right space-x-1">
                        <Button variant="ghost" onClick={() => openViewModal(patient)}>
                          View
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            onClick={() => openEditModal(patient)}
                            disabled={submitting}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && !isPatientRole && (
                          <Button
                            variant="ghost-danger"
                            onClick={() => handleDelete(patient)}
                            disabled={submitting}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={showCreateModal} title="Add Patient" onClose={closeCreateModal} wide>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Creates a login account and patient profile.{" "}
            {isDoctor && "The patient will be automatically assigned to you."}
          </p>
          <form onSubmit={handleCreate}>
            <FormSection title="Account Information">
              {/* <FormField label="User ID" name="id" value={createForm.id} onChange={handleCreateChange} required placeholder="U_PAT001" />
              <FormField label="Patient ID" name="patient_id" value={createForm.patient_id} onChange={handleCreateChange} required placeholder="PAT001" /> */}
              <FormField label="Username" name="username" value={createForm.username} onChange={handleCreateChange} required />
              <FormField label="Email" name="email" type="email" value={createForm.email} onChange={handleCreateChange} required />
              <FormField label="Password" name="password" type="password" value={createForm.password} onChange={handleCreateChange} required placeholder="Min 6 characters" />
            </FormSection>

            <FormSection title="Personal Information">
              <FormField label="First Name" name="first_name" value={createForm.first_name} onChange={handleCreateChange} required />
              <FormField label="Last Name" name="last_name" value={createForm.last_name} onChange={handleCreateChange} required />
              <FormField label="Age" name="age" type="number" value={createForm.age} onChange={handleCreateChange} required min={0} max={130} />
              <FormField label="Gender" name="gender" value={createForm.gender} onChange={handleCreateChange} required options={GENDER_OPTIONS} />
            </FormSection>

            <FormSection title="Contact Information">
              <FormField label="Phone" name="phone" value={createForm.phone} onChange={handleCreateChange} required />
              <FormField label="Address" name="address" value={createForm.address} onChange={handleCreateChange} required />
            </FormSection>

            <FormSection title="Medical Information">
              <FormField label="Blood Group" name="blood_group" value={createForm.blood_group} onChange={handleCreateChange} required placeholder="O+" />
              <FormField label="Disease" name="disease" value={createForm.disease} onChange={handleCreateChange} required />
              {isAdmin && (
                <FormField
                  label="Assigned Doctor"
                  name="assigned_doctor_id"
                  value={createForm.assigned_doctor_id}
                  onChange={handleCreateChange}
                  options={doctorOptions}
                />
              )}
              {isDoctor && (
                <div>
                  <label className="form-label">Assigned Doctor</label>
                  <input
                    className="form-input bg-gray-50"
                    value={`${user?.profile?.name || "You"} (${doctorProfileId})`}
                    disabled
                    readOnly
                  />
                </div>
              )}
            </FormSection>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Patient"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={showEditModal} title="Edit Patient" onClose={closeEditModal} wide>
          <form onSubmit={handleEdit}>
            <FormSection title="Personal Information">
              <FormField label="First Name" name="first_name" value={editForm.first_name} onChange={handleEditChange} required />
              <FormField label="Last Name" name="last_name" value={editForm.last_name} onChange={handleEditChange} required />
              <FormField label="Age" name="age" type="number" value={editForm.age} onChange={handleEditChange} required min={0} max={130} />
              <FormField label="Gender" name="gender" value={editForm.gender} onChange={handleEditChange} required options={GENDER_OPTIONS} />
            </FormSection>

            <FormSection title="Contact Information">
              <FormField label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} required />
              <FormField label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} required />
              <FormField label="Address" name="address" value={editForm.address} onChange={handleEditChange} required />
            </FormSection>

            <FormSection title="Medical Information">
              <FormField label="Blood Group" name="blood_group" value={editForm.blood_group} onChange={handleEditChange} required />
              <FormField label="Disease" name="disease" value={editForm.disease} onChange={handleEditChange} required />
              {isAdmin && (
                <FormField
                  label="Assigned Doctor"
                  name="doctor_id"
                  value={editForm.doctor_id}
                  onChange={handleEditChange}
                  options={doctorOptions}
                />
              )}
            </FormSection>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={showViewModal} title="Patient Details" onClose={() => setShowViewModal(false)}>
          {selectedPatient && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Patient ID" value={selectedPatient.id} />
              <DetailRow label="User ID" value={selectedPatient.user_id || "—"} />
              <DetailRow label="Name" value={`${selectedPatient.first_name} ${selectedPatient.last_name}`} />
              <DetailRow label="Age / Gender" value={`${selectedPatient.age} / ${selectedPatient.gender}`} />
              <DetailRow label="Email" value={selectedPatient.email} />
              <DetailRow label="Phone" value={selectedPatient.phone} />
              <DetailRow label="Blood Group" value={selectedPatient.blood_group} />
              <DetailRow label="Address" value={selectedPatient.address} />
              <DetailRow label="Disease" value={selectedPatient.disease} />
              <DetailRow label="Assigned Doctor" value={selectedPatient.doctor_id || "None"} />
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <p>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  );
}
