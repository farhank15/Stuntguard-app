import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { supabase } from "@/client/supabaseClient";
import Avatar from "@assets/icons/avatar.png";
import { v4 as uuidv4 } from "uuid";

const CDNURL =
  "https://kqwhwlnyvahaddispubu.supabase.co/storage/v1/object/public/images/";

const EditMemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nama: "",
    nik: "",
    foto: null,
    fotoPreview: null,
    alamat: "",
    usia: "",
    jenis_kelamin: "",
    nomor_telepon: "",
  });

  const [oldPhotoPath, setOldPhotoPath] = useState(null);
  const [errors, setErrors] = useState({});
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      const { data, error } = await supabase
        .from("orangtua")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching member:", error.message);
      } else {
        setFormData({
          nama: data.nama,
          nik: data.nik,
          fotoPreview: data.foto ? data.foto : Avatar,
          alamat: data.alamat,
          usia: data.usia,
          jenis_kelamin: data.jenis_kelamin,
          nomor_telepon: data.nomor_telepon,
        });
        setOldPhotoPath(data.foto);
      }
    };

    fetchMember();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    let error = "";

    if (name === "foto") {
      const file = files[0];
      if (file) {
        if (file.size > 1048576) {
          error = "Ukuran gambar harus di bawah 1MB!";
          Swal.fire({
            title: "Error",
            text: "Ukuran gambar harus di bawah 1MB!",
            icon: "error",
            confirmButtonText: "OK",
          });
        } else {
          setFormData({
            ...formData,
            foto: file,
            fotoPreview: URL.createObjectURL(file),
          });
          setIsPhotoRemoved(false);
        }
      } else {
        setFormData({
          ...formData,
          foto: null,
          fotoPreview: Avatar,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    setErrors({
      ...errors,
      [name]: error,
    });
  };

  const handleRemovePhoto = async () => {
    setFormData({
      ...formData,
      foto: null,
      fotoPreview: Avatar,
    });
    setIsPhotoRemoved(true);

    if (oldPhotoPath) {
      await deleteOldImage(oldPhotoPath);
      setOldPhotoPath(null);
    }
  };

  const validateForm = () => {
    const { nama, nik, alamat, usia, jenis_kelamin, nomor_telepon } = formData;
    const newErrors = {};
    if (!nama) newErrors.nama = "Nama harus diisi!";
    if (!nik) {
      newErrors.nik = "NIK harus diisi!";
    } else if (!/^\d+$/.test(nik) || nik.length !== 16) {
      newErrors.nik = "NIK harus berisi 16 angka!";
    }
    if (!alamat) newErrors.alamat = "Alamat harus diisi!";
    if (!usia) {
      newErrors.usia = "Usia harus diisi!";
    } else if (usia <= 0) {
      newErrors.usia = "Usia harus lebih dari 0!";
    }
    if (!jenis_kelamin)
      newErrors.jenis_kelamin = "Jenis kelamin harus dipilih!";
    if (!nomor_telepon) {
      newErrors.nomor_telepon = "Nomor telepon harus diisi!";
    } else if (!/^\d+$/.test(nomor_telepon)) {
      newErrors.nomor_telepon = "Nomor telepon harus berisi angka saja!";
    } else if (nomor_telepon.length <= 10) {
      newErrors.nomor_telepon = "Nomor telepon harus lebih dari 11 angka!";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (file) => {
    const fileName = uuidv4();
    const { data, error } = await supabase.storage
      .from("images")
      .upload(`profile-ortu/${fileName}`, file);

    if (error) {
      console.error("Error uploading image:", error);
      Swal.fire({
        title: "Error",
        text: "Gagal mengupload gambar!",
        icon: "error",
        confirmButtonText: "OK",
      });
      return null;
    }

    return `${CDNURL}profile-ortu/${fileName}`;
  };

  const deleteOldImage = async (path) => {
    if (path && path !== Avatar) {
      const fileName = path.split("/").pop(); // Get the file name from the path
      const { error } = await supabase.storage
        .from("images")
        .remove([`profile-ortu/${fileName}`]);
      if (error) {
        console.error("Error deleting old image:", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      let photoUrl = oldPhotoPath;
      if (formData.foto) {
        const uploadedUrl = await uploadImage(formData.foto);
        if (uploadedUrl) {
          await deleteOldImage(oldPhotoPath);
          photoUrl = uploadedUrl;
        }
      } else if (isPhotoRemoved) {
        await deleteOldImage(oldPhotoPath);
        photoUrl = null;
      }

      const { error } = await supabase
        .from("orangtua")
        .update({
          nama: formData.nama,
          nik: formData.nik,
          foto: photoUrl,
          alamat: formData.alamat,
          usia: formData.usia,
          jenis_kelamin: formData.jenis_kelamin,
          nomor_telepon: formData.nomor_telepon,
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating data:", error.message);
        Swal.fire({
          title: "Error",
          text: "Gagal memperbarui data!",
          icon: "error",
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          title: "Berhasil",
          text: "Data berhasil diperbarui!",
          icon: "success",
          confirmButtonText: "OK",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/data-orangtua");
          }
        });
      }
    }
  };

  const handleCancel = () => {
    navigate("/data-orangtua");
  };

  return (
    <div className="flex justify-center items-center px-2 py-12 bg-gray-100">
      <div className="card w-full lg:w-1/2 bg-white shadow-xl p-6">
        <h2 className="card-title text-center mb-4">Edit Anggota/Orangtua</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Nama</span>
            </label>
            <input
              type="text"
              name="nama"
              className="input input-bordered"
              value={formData.nama}
              onChange={handleChange}
              required
            />
            {errors.nama && (
              <span className="text-red-500 text-sm">{errors.nama}</span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">NIK</span>
            </label>
            <input
              type="text"
              name="nik"
              className="input input-bordered"
              value={formData.nik}
              onChange={handleChange}
              required
            />
            {errors.nik && (
              <span className="text-red-500 text-sm">{errors.nik}</span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Foto</span>
            </label>
            <div className="flex items-center">
              <input
                type="file"
                name="foto"
                className="hidden"
                id="foto"
                onChange={handleChange}
              />
              <label htmlFor="foto" className="btn btn-primary cursor-pointer">
                {formData.fotoPreview && formData.fotoPreview !== Avatar
                  ? "Ganti Foto"
                  : "Pilih Foto"}
              </label>
              {formData.fotoPreview && (
                <img
                  src={formData.fotoPreview}
                  alt="Preview"
                  className="ml-4 h-16 w-16 rounded-full object-cover"
                />
              )}
              {formData.fotoPreview && formData.fotoPreview !== Avatar && (
                <button
                  type="button"
                  className="btn btn-danger ml-4"
                  onClick={handleRemovePhoto}
                >
                  Hapus Foto
                </button>
              )}
            </div>
            {errors.foto && (
              <span className="text-red-500 text-sm">{errors.foto}</span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Alamat</span>
            </label>
            <input
              type="text"
              name="alamat"
              className="input input-bordered"
              value={formData.alamat}
              onChange={handleChange}
              required
            />
            {errors.alamat && (
              <span className="text-red-500 text-sm">{errors.alamat}</span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Usia</span>
            </label>
            <input
              type="number"
              name="usia"
              className="input input-bordered"
              value={formData.usia}
              onChange={handleChange}
              required
            />
            {errors.usia && (
              <span className="text-red-500 text-sm">{errors.usia}</span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Jenis Kelamin</span>
            </label>
            <select
              name="jenis_kelamin"
              className="select select-bordered"
              value={formData.jenis_kelamin}
              onChange={handleChange}
              required
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
            {errors.jenis_kelamin && (
              <span className="text-red-500 text-sm">
                {errors.jenis_kelamin}
              </span>
            )}
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Nomor Telepon</span>
            </label>
            <input
              type="text"
              name="nomor_telepon"
              className="input input-bordered"
              value={formData.nomor_telepon}
              onChange={handleChange}
              required
            />
            {errors.nomor_telepon && (
              <span className="text-red-500 text-sm">
                {errors.nomor_telepon}
              </span>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              className="btn px-8 btn-secondary"
              onClick={handleCancel}
            >
              Batal
            </button>
            <button type="submit" className="btn px-8 btn-primary">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberForm;
