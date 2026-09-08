import {
  useState,
  useCallback,
  useEffect,
} from "react";

import Alert from "../components/Alert";
import Button from "../components/Button";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import DashboardLayout from "../layout/DashboardLayout";

import DoctorLocationMap from "../components/DoctorLocationMap";
import AddressAutocomplete from "../components/AddressAutoComplete";

import { registerDoctor } from "../api/authApi";

import {
  deleteDoctor,
  getDoctors,
  updateDoctor,
} from "../api/doctorApi";

import { usePermissions } from "../hooks/usePermissions";

import {
  getApiData,
  getApiMessage,
  getErrorMessage,
} from "../utils/apiHelpers";


/* =========================================================
   EMPTY FORMS
========================================================= */

const emptyCreateForm = {
  // id: "",
  username: "",
  email: "",
  password: "",
  // doctor_id: "",
  name: "",
  specialization: "",
  hospital_name: "",
  address: "",
  latitude: null,
  longitude: null,
};

const emptyEditForm = {
  name: "",
  specialization: "",
  hospital_name: "",
  address: "",
};


/* =========================================================
   COMPONENT
========================================================= */

export default function Doctors() {

  const { hasPermission } =
    usePermissions();


  /* =======================================================
     PERMISSIONS
  ======================================================= */

  const canCreate =
    hasPermission("doctor.create");

  const canUpdate =
    hasPermission("doctor.update");

  const canDelete =
    hasPermission("doctor.delete");


  /* =======================================================
     STATE
  ======================================================= */

  const [doctors, setDoctors] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [createForm, setCreateForm] =
    useState(emptyCreateForm);

  const [editForm, setEditForm] =
    useState(emptyEditForm);

  const [editingDoctor, setEditingDoctor] =
    useState(null);


  /* =======================================================
     LOCATION HANDLERS
  ======================================================= */

  const handleAddressChange =
    useCallback((address) => {

      console.log(
        "Address changed:",
        address
      );

      setCreateForm((prev) => ({
        ...prev,
        address,
      }));

    }, []);


  const handleLocationChange =
    useCallback(
      ({
        latitude,
        longitude,
      }) => {

        console.log(
          "Location changed:"
        );

        console.log(
          "Latitude:",
          latitude
        );

        console.log(
          "Longitude:",
          longitude
        );

        setCreateForm((prev) => ({
          ...prev,
          latitude:
            Number(latitude),
          longitude:
            Number(longitude),
        }));

      },
      []
    );

  const handleEditAddressChange = (address) => {

    setEditForm((prev) => ({
      ...prev,
      address,
    }));

  };


  const handleEditLocationChange = ({
    latitude,
    longitude,
  }) => {

    console.log(
      "Edit location changed:",
      latitude,
      longitude
    );

    setEditForm((prev) => ({
      ...prev,
      latitude: Number(latitude),
      longitude: Number(longitude),
    }));

  };


  /* =======================================================
     FETCH DOCTORS
  ======================================================= */

  const fetchDoctors =
    useCallback(async () => {

      try {

        setLoading(true);
        setError("");

        const response = await getDoctors();

        console.log("GET DOCTORS RESPONSE:", response);
        console.log("GET DOCTORS DATA:", response.data);

        setDoctors(response.data.data || []);

      } catch (err) {

        console.error(
          "Fetch doctors error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Failed to fetch doctors"
          )
        );

      } finally {

        setLoading(false);

      }

    }, []);


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    fetchDoctors();

  }, [fetchDoctors]);


  /* =======================================================
     CREATE FORM CHANGE
  ======================================================= */

  const handleCreateChange = (
    e
  ) => {

    const {
      name,
      value,
    } = e.target;

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));

  };


  /* =======================================================
     EDIT FORM CHANGE
  ======================================================= */

  const handleEditChange = (
    e
  ) => {

    const {
      name,
      value,
    } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

  };


  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (doctor) => {

    setEditingDoctor(doctor);

    setEditForm({
      name: doctor.name || "",
      specialization: doctor.specialization || "",
      hospital_name: doctor.hospital_name || "",
      address: doctor.address || "",
      latitude:
        doctor.latitude != null
          ? Number(doctor.latitude)
          : null,
      longitude:
        doctor.longitude != null
          ? Number(doctor.longitude)
          : null,
    });

    setShowEditModal(true);

    setError("");
    setSuccess("");
  };

  /* =======================================================
     CLOSE CREATE MODAL
  ======================================================= */

  const closeCreateModal = () => {

    setShowCreateModal(
      false
    );

    setCreateForm({
      ...emptyCreateForm,
    });

  };


  /* =======================================================
     CLOSE EDIT MODAL
  ======================================================= */

  const closeEditModal = () => {

    setShowEditModal(
      false
    );

    setEditingDoctor(
      null
    );

    setEditForm({
      ...emptyEditForm,
    });

  };


  /* =======================================================
     CREATE DOCTOR
  ======================================================= */

  const handleCreate = async (
    e
  ) => {

    e.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {

      /* ---------------------------------------------
         VALIDATE ADDRESS
      --------------------------------------------- */

      if (
        !createForm.address ||
        !createForm.address.trim()
      ) {

        throw new Error(
          "Doctor address is required"
        );

      }


      /* ---------------------------------------------
         VALIDATE LATITUDE
      --------------------------------------------- */

      if (
        createForm.latitude === null ||
        createForm.latitude === undefined ||
        createForm.latitude === ""
      ) {

        throw new Error(
          "Please select a location from Google address suggestions"
        );

      }


      /* ---------------------------------------------
         VALIDATE LONGITUDE
      --------------------------------------------- */

      if (
        createForm.longitude === null ||
        createForm.longitude === undefined ||
        createForm.longitude === ""
      ) {

        throw new Error(
          "Please select a location from Google address suggestions"
        );

      }


      /* ---------------------------------------------
         CONVERT COORDINATES
      --------------------------------------------- */

      const latitude =
        Number(
          createForm.latitude
        );

      const longitude =
        Number(
          createForm.longitude
        );


      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {

        throw new Error(
          "Invalid latitude or longitude"
        );

      }


      /* ---------------------------------------------
         PAYLOAD
      --------------------------------------------- */

      const payload = {

        // id:
        //   createForm.id,

        username:
          createForm.username,

        email:
          createForm.email,

        password:
          createForm.password,

        // doctor_id:
        //   createForm.doctor_id,

        name:
          createForm.name,

        specialization:
          createForm.specialization,

        hospital_name:
          createForm.hospital_name,

        address:
          createForm.address,

        latitude,

        longitude,

      };


      console.log(
        "Doctor registration payload:",
        payload
      );


      /* ---------------------------------------------
         API CALL
      --------------------------------------------- */

      const response =
        await registerDoctor(
          payload
        );


      console.log(
        "Doctor registration response:",
        response
      );


      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

      setSuccess(
        getApiMessage(
          response,
          "Doctor created successfully"
        )
      );


      closeCreateModal();

      await fetchDoctors();

    } catch (err) {

      console.error(
        "Doctor registration error:",
        err
      );

      console.error(
        "Backend response:",
        err.response?.data
      );

      setError(
        getErrorMessage(
          err,
          "Failed to create doctor"
        )
      );

    } finally {

      setSubmitting(false);

    }

  };


  /* =======================================================
     UPDATE DOCTOR
  ======================================================= */

  const handleEdit = async (
    e
  ) => {

    e.preventDefault();

    if (
      !editingDoctor ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {

      const response =
        await updateDoctor(
          editingDoctor.id,
          editForm
        );

      setSuccess(
        getApiMessage(
          response,
          "Doctor updated successfully"
        )
      );

      closeEditModal();

      await fetchDoctors();

    } catch (err) {

      console.error(
        "Update doctor error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to update doctor"
        )
      );

    } finally {

      setSubmitting(false);

    }

  };


  /* =======================================================
     DELETE DOCTOR
  ======================================================= */

  const handleDelete = async (
    doctor
  ) => {

    if (!canDelete) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete doctor "${doctor.name}" (${doctor.id})?`
      );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {

      await deleteDoctor(
        doctor.id
      );

      setSuccess(
        "Doctor deleted successfully"
      );

      await fetchDoctors();

    } catch (err) {

      console.error(
        "Delete doctor error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to delete doctor"
        )
      );

    } finally {

      setSubmitting(false);

    }

  };


  /* =======================================================
     ACTION VISIBILITY
  ======================================================= */

  const showActions =
    canUpdate ||
    canDelete;


  /* =======================================================
     JSX
  ======================================================= */

  return (
    <DashboardLayout>

      <div className="text-left">


        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <PageHeader
          title="Doctors"
          subtitle="Manage doctors in the hospital"

          action={
            canCreate ? (

              <Button
                onClick={() => {

                  setShowCreateModal(
                    true
                  );

                  setError("");
                  setSuccess("");

                }}

                disabled={
                  submitting
                }
              >
                + Add Doctor
              </Button>

            ) : null
          }
        />


        {/* =================================================
            ALERTS
        ================================================= */}

        <Alert
          type="error"
          message={error}
          onClose={() =>
            setError("")
          }
        />

        <Alert
          type="success"
          message={success}
          onClose={() =>
            setSuccess("")
          }
        />


        {/* =================================================
            DOCTORS TABLE
        ================================================= */}

        <div className="data-table-wrap">

          {loading ? (

            <div className="p-10 text-center text-gray-500">

              Loading doctors...

            </div>

          ) : doctors.length === 0 ? (

            <div className="p-10 text-center text-gray-500">

              No doctors found.

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="data-table">

                <thead>

                  <tr>

                    {/* <th>ID</th> */}

                    <th>Name</th>

                    <th>Specialization</th>

                    {/* <th>User ID</th> */}

                    <th>Hospital Name</th>

                    <th>Address</th>

                    {/* <th>Latitude</th>

                    <th>Longitude</th> */}

                    {showActions && (

                      <th className="text-right">
                        Actions
                      </th>

                    )}

                  </tr>

                </thead>


                <tbody>

                  {doctors.map(
                    (doctor) => (

                      <tr
                        key={
                          doctor.id
                        }
                      >

                        {/* <td className="font-medium">

                          {doctor.id}

                        </td> */}


                        <td>

                          {doctor.name}

                        </td>


                        <td>

                          {
                            doctor.specialization
                          }

                        </td>


                        {/* <td
                          style={{
                            color:
                              "var(--color-text-secondary)",
                          }}
                        >

                          {
                            doctor.user_id
                          }

                        </td> */}


                        <td>

                          {
                            doctor.hospital_name ||
                            "N/A"
                          }

                        </td>


                        <td>

                          {
                            doctor.address ||
                            "N/A"
                          }

                        </td>


                        {/* <td>

                          {
                            doctor.latitude ??
                            "N/A"
                          }

                        </td> */}


                        {/* <td>

                          {
                            doctor.longitude ??
                            "N/A"
                          }

                        </td> */}


                        {showActions && (

                          <td className="text-right space-x-1">

                            {canUpdate && (

                              <Button
                                variant="ghost"
                                onClick={() =>
                                  openEditModal(
                                    doctor
                                  )
                                }
                                disabled={
                                  submitting
                                }
                              >
                                Edit
                              </Button>

                            )}


                            {canDelete && (

                              <Button
                                variant="ghost-danger"
                                onClick={() =>
                                  handleDelete(
                                    doctor
                                  )
                                }
                                disabled={
                                  submitting
                                }
                              >
                                Delete
                              </Button>

                            )}

                          </td>

                        )}

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* =================================================
            CREATE DOCTOR MODAL
        ================================================= */}

        <Modal
          open={
            showCreateModal
          }

          title="Add Doctor"

          onClose={
            closeCreateModal
          }

          wide
        >

          <p className="text-sm text-gray-500 mb-4">

            Creates a login account and
            doctor profile together.
            Select the clinic address
            from Google suggestions and
            adjust the marker if necessary.

          </p>


          <form
            onSubmit={
              handleCreate
            }

            className="space-y-4"
          >


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              {/* USER ID */}

              {/* <FormField
                label="User ID"
                name="id"
                value={
                  createForm.id
                }
                onChange={
                  handleCreateChange
                }
                required
              /> */}


              {/* DOCTOR ID */}

              {/* <FormField
                label="Doctor ID"
                name="doctor_id"
                value={
                  createForm.doctor_id
                }
                onChange={
                  handleCreateChange
                }
                required
              /> */}


              {/* USERNAME */}

              <FormField
                label="Username"
                name="username"
                value={
                  createForm.username
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* EMAIL */}

              <FormField
                label="Email"
                name="email"
                type="email"
                value={
                  createForm.email
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* PASSWORD */}

              <FormField
                label="Password"
                name="password"
                type="password"
                value={
                  createForm.password
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* FULL NAME */}

              <FormField
                label="Full Name"
                name="name"
                value={
                  createForm.name
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* SPECIALIZATION */}

              <FormField
                label="Specialization"
                name="specialization"
                value={
                  createForm.specialization
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* HOSPITAL */}

              <FormField
                label="Hospital Name"
                name="hospital_name"
                value={
                  createForm.hospital_name
                }
                onChange={
                  handleCreateChange
                }
                required
              />


              {/* =========================================
                  ADDRESS AUTOCOMPLETE
              ========================================= */}

              <div className="md:col-span-2">

                <label className="block text-sm font-medium mb-2">

                  Clinic Address

                </label>


                <AddressAutocomplete
                  value={
                    createForm.address
                  }

                  onAddressChange={
                    handleAddressChange
                  }

                  onLocationChange={
                    handleLocationChange
                  }
                />

              </div>


              {/* =========================================
                  GOOGLE MAP
              ========================================= */}

              <div className="md:col-span-2">

                <DoctorLocationMap
                  latitude={
                    createForm.latitude
                  }

                  longitude={
                    createForm.longitude
                  }

                  onLocationChange={
                    handleLocationChange
                  }
                />

              </div>


              {/* =========================================
                  LOCATION INFORMATION
              ========================================= */}

              <div className="md:col-span-2 rounded-md bg-gray-50 p-4 text-sm text-gray-600">

                <div className="font-semibold mb-2">

                  Selected Location

                </div>


                <div>

                  Latitude:{" "}

                  <span className="font-medium">

                    {
                      createForm.latitude ??
                      "Not selected"
                    }

                  </span>

                </div>


                <div>

                  Longitude:{" "}

                  <span className="font-medium">

                    {
                      createForm.longitude ??
                      "Not selected"
                    }

                  </span>

                </div>


                <p className="mt-2">

                  Select an address from the
                  Google suggestions. The map
                  will move to that location.
                  You can then drag the marker
                  to the exact clinic location.

                </p>

              </div>

            </div>


            {/* =========================================
                BUTTONS
            ========================================= */}

            <div className="flex justify-end gap-3 pt-2">

              <Button
                variant="secondary"
                type="button"
                onClick={
                  closeCreateModal
                }
                disabled={
                  submitting
                }
              >
                Cancel
              </Button>


              <Button
                type="submit"
                disabled={
                  submitting
                }
              >

                {submitting
                  ? "Creating..."
                  : "Add Doctor"}

              </Button>

            </div>

          </form>

        </Modal>


        {/* =================================================
            EDIT DOCTOR MODAL
        ================================================= */}

        {/* =================================================
    EDIT DOCTOR MODAL
================================================= */}

        <Modal
          open={showEditModal}
          title="Edit Doctor"
          onClose={closeEditModal}
          wide
        >

          <form
            onSubmit={handleEdit}
            className="space-y-4"
          >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* =========================================
          NAME
      ========================================= */}

              <FormField
                label="Full Name"
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
                required
              />


              {/* =========================================
          SPECIALIZATION
      ========================================= */}

              <FormField
                label="Specialization"
                name="specialization"
                value={editForm.specialization}
                onChange={handleEditChange}
                required
              />


              {/* =========================================
          HOSPITAL
      ========================================= */}

              <FormField
                label="Hospital Name"
                name="hospital_name"
                value={editForm.hospital_name}
                onChange={handleEditChange}
                required
              />


              {/* =========================================
          ADDRESS AUTOCOMPLETE
      ========================================= */}

              <div className="md:col-span-2">

                <label className="block text-sm font-medium mb-2">
                  Hospital Address
                </label>

                <AddressAutocomplete
                  value={editForm.address}
                  onAddressChange={
                    handleEditAddressChange
                  }
                  onLocationChange={
                    handleEditLocationChange
                  }
                />

              </div>


              {/* =========================================
          GOOGLE MAP
      ========================================= */}

              <div className="md:col-span-2">

                <DoctorLocationMap
                  latitude={editForm.latitude}
                  longitude={editForm.longitude}
                  onLocationChange={
                    handleEditLocationChange
                  }
                />

              </div>


              {/* =========================================
          COORDINATES
      ========================================= */}

              <div className="md:col-span-2 rounded-md bg-gray-50 p-4 text-sm text-gray-600">

                <div className="font-semibold mb-2">
                  Selected Location
                </div>

                <div>
                  Latitude:{" "}
                  <span className="font-medium">
                    {editForm.latitude ??
                      "Not selected"}
                  </span>
                </div>

                <div>
                  Longitude:{" "}
                  <span className="font-medium">
                    {editForm.longitude ??
                      "Not selected"}
                  </span>
                </div>

                <p className="mt-2">
                  Select a new address or drag the
                  marker to adjust the doctor's exact
                  clinic location.
                </p>

              </div>

            </div>


            {/* =========================================
        BUTTONS
    ========================================= */}

            <div className="flex justify-end gap-3 pt-2">

              <Button
                variant="secondary"
                type="button"
                onClick={closeEditModal}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Updating..."
                  : "Save Changes"}
              </Button>

            </div>

          </form>

        </Modal>

      </div>

    </DashboardLayout>
  );
}