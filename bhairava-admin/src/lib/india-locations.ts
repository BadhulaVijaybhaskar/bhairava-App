/** India states / UTs with major cities for project location dropdowns */

export const COUNTRIES = [{ code: "IN", name: "India" }] as const;

export const INDIA_STATES: { name: string; cities: string[] }[] = [
  {
    name: "Andhra Pradesh",
    cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kakinada", "Rajahmundry", "Nellore", "Kurnool"],
  },
  {
    name: "Arunachal Pradesh",
    cities: ["Itanagar", "Tawang", "Pasighat"],
  },
  {
    name: "Assam",
    cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  },
  {
    name: "Bihar",
    cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  },
  {
    name: "Chhattisgarh",
    cities: ["Raipur", "Bhilai", "Bilaspur", "Durg"],
  },
  {
    name: "Goa",
    cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  },
  {
    name: "Gujarat",
    cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar"],
  },
  {
    name: "Haryana",
    cities: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal"],
  },
  {
    name: "Himachal Pradesh",
    cities: ["Shimla", "Dharamshala", "Manali", "Solan"],
  },
  {
    name: "Jharkhand",
    cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  },
  {
    name: "Karnataka",
    cities: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi"],
  },
  {
    name: "Kerala",
    cities: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kannur"],
  },
  {
    name: "Madhya Pradesh",
    cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  },
  {
    name: "Maharashtra",
    cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Navi Mumbai"],
  },
  {
    name: "Manipur",
    cities: ["Imphal"],
  },
  {
    name: "Meghalaya",
    cities: ["Shillong"],
  },
  {
    name: "Mizoram",
    cities: ["Aizawl"],
  },
  {
    name: "Nagaland",
    cities: ["Kohima", "Dimapur"],
  },
  {
    name: "Odisha",
    cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  },
  {
    name: "Punjab",
    cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  },
  {
    name: "Rajasthan",
    cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
  },
  {
    name: "Sikkim",
    cities: ["Gangtok"],
  },
  {
    name: "Tamil Nadu",
    cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
  },
  {
    name: "Telangana",
    cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  },
  {
    name: "Tripura",
    cities: ["Agartala"],
  },
  {
    name: "Uttar Pradesh",
    cities: ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut"],
  },
  {
    name: "Uttarakhand",
    cities: ["Dehradun", "Haridwar", "Nainital", "Rishikesh"],
  },
  {
    name: "West Bengal",
    cities: ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  },
  {
    name: "Andaman and Nicobar Islands",
    cities: ["Port Blair"],
  },
  {
    name: "Chandigarh",
    cities: ["Chandigarh"],
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    cities: ["Daman", "Diu", "Silvassa"],
  },
  {
    name: "Delhi",
    cities: ["New Delhi", "Delhi"],
  },
  {
    name: "Jammu and Kashmir",
    cities: ["Srinagar", "Jammu"],
  },
  {
    name: "Ladakh",
    cities: ["Leh", "Kargil"],
  },
  {
    name: "Lakshadweep",
    cities: ["Kavaratti"],
  },
  {
    name: "Puducherry",
    cities: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  },
];

export function citiesForState(stateName: string): string[] {
  return INDIA_STATES.find((s) => s.name === stateName)?.cities ?? [];
}
