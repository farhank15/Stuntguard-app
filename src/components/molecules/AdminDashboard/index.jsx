import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/client/supabaseClient";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import dayjs from "dayjs";
import "dayjs/locale/id";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);
dayjs.locale("id");

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const { id: adminId } = useParams();
  const [summary, setSummary] = useState({});
  const [activityHistory, setActivityHistory] = useState([]);
  const [averageGrowth, setAverageGrowth] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      const { data: members, error: membersError } = await supabase
        .from("orangtua")
        .select("*")
        .eq("admin_id", adminId);

      const { data: children, error: childrenError } = await supabase
        .from("anak")
        .select("*")
        .eq("admin_id", adminId);

      if (membersError || childrenError) {
        console.error(
          "Error fetching summary data",
          membersError,
          childrenError
        );
        return;
      }

      setSummary({
        totalMembers: members.length,
        totalChildren: children.length,
      });

      const { data: activities, error: activitiesError } = await supabase
        .from("rekam_medis_posyandu")
        .select(
          `id, id_anak, aktivitas_imunisasi, status_imunisasi, dibuat_pada`
        )
        .in(
          "id_anak",
          children.map((child) => child.id)
        )
        .order("dibuat_pada", { ascending: false });

      if (activitiesError) {
        console.error("Error fetching activity history", activitiesError);
        return;
      }

      setActivityHistory(
        activities.map((activity) => ({
          name: children.find((child) => child.id === activity.id_anak)?.nama,
          aktivitas: activity.aktivitas_imunisasi || "Tidak ada aktivitas",
          status: activity.status_imunisasi || "Tidak ada status",
          date: activity.dibuat_pada,
        }))
      );

      const { data: growthData, error: growthError } = await supabase
        .from("rekam_medis_posyandu")
        .select("tanggal_kunjungan, tinggi_badan, berat_badan")
        .in(
          "id_anak",
          children.map((child) => child.id)
        );

      if (growthError) {
        console.error("Error fetching average growth data", growthError);
        return;
      }

      const yearsSet = new Set(
        growthData.map((data) => dayjs(data.tanggal_kunjungan).year())
      );
      setYears([...yearsSet]);
      setSelectedYear([...yearsSet][0]); // Set default selected year

      const filteredData = growthData.filter(
        (data) => dayjs(data.tanggal_kunjungan).year() === selectedYear
      );

      const averageData = filteredData.reduce((acc, curr) => {
        const date = dayjs(curr.tanggal_kunjungan).format("MM");
        if (!acc[date])
          acc[date] = { tinggi_badan: 0, berat_badan: 0, count: 0 };

        acc[date].tinggi_badan += curr.tinggi_badan;
        acc[date].berat_badan += curr.berat_badan;
        acc[date].count += 1;
        return acc;
      }, {});

      const formattedData = Object.keys(averageData)
        .sort()
        .map((month) => ({
          month,
          tinggi_badan:
            averageData[month].tinggi_badan / averageData[month].count,
          berat_badan:
            averageData[month].berat_badan / averageData[month].count,
        }));

      setAverageGrowth(formattedData);
    };

    fetchSummary();
  }, [adminId, selectedYear]);

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  const chartData = {
    labels: averageGrowth.map((data) => dayjs(data.month, "MM").format("MMMM")),
    datasets: [
      {
        label: "Rata-rata Tinggi Badan (cm)",
        data: averageGrowth.map((data) => data.tinggi_badan),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.5,
      },
      {
        label: "Rata-rata Berat Badan (kg)",
        data: averageGrowth.map((data) => data.berat_badan),
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        fill: true,
        tension: 0.5,
      },
    ],
  };

  return (
    <div className="container h-auto px-4 py-8 mx-auto border-2 rounded-xl">
      <h2 className="py-2 mb-6 text-2xl font-bold text-center rounded-md text-accent-800 bg-success-300">
        Admin Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold">Ringkasan</h3>
          <p className="mt-4 text-gray-600">
            Jumlah Anggota: {summary.totalMembers}
          </p>
          <p className="mt-2 text-gray-600">
            Jumlah Anak: {summary.totalChildren}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold">Riwayat Aktivitas</h3>
          {activityHistory.length > 0 ? (
            <ul className="mt-4 space-y-2 text-gray-600">
              {activityHistory.map((activity, index) => (
                <li key={index}>
                  Nama: {activity.name || "Tidak ada nama"} - Aktivitas:{" "}
                  {activity.aktivitas} - Status: {activity.status} -{" "}
                  {new Date(activity.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-gray-600">Belum ada aktivitas.</p>
          )}
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          Grafik Pertumbuhan Rata-rata Anak
        </h3>
        <div className="form-control">
          <label className="label">Tahun</label>
          <select
            className="select select-bordered"
            value={selectedYear}
            onChange={handleYearChange}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-8">
        <div className="h-96 mt-14 md:h-[45rem]">
          <Line
            data={chartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
