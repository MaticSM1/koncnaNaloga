// ConsoleApplication2.cpp : This file contains the 'main' function. Program execution begins and ends there.
//
#include <iostream>
#include <vector>
#include <fstream>
#include <string>
#include <sstream>
#include <iomanip>
#include <random>
using namespace std;
void print_vector(const vector<int>& vec)
{
	for (int i = 0; i < vec.size(); i++) {
		cout << vec[i] << ",";
	}
	cout << endl;
}


class Seq_compresion {
private:
	string result;
	string filename;
	vector<int> values;
	size_t origSize;
	size_t newSize;
public:

	Seq_compresion(string file) : filename(file) {}

	void printSizes() {
		cout << "          FILE SIZES\n";
		cout << "=============================\n";

		cout <<left << setw(20) << "Original size:"
			<< setw(3) << origSize << " bytes\n";

		cout <<left << setw(20) << "Compressed size:"
			 << setw(3) << newSize << " bytes\n";

		cout << "------------------------------\n";

		double ratio = static_cast<double>(origSize) / newSize;
		double efficiency = (1.0 - (double)newSize / origSize) * 100.0;

		cout << left << setw(20) << "Compression ratio:"
			<< setw(3) << setprecision(2) << ratio << " : 1\n";

		cout << left << setw(20) << "Eficiency:"
			<< setw(3) << setprecision(2) << efficiency << "%\n";
		cout << "==============================\n\n";


		cout << "Compressed file is " << setprecision(2) << (((double)newSize / origSize) * 100.0) << "% of its original size.\n\n";
	}

	void readFile() {
		ifstream file(filename);
		if (!file.is_open()) return;
		string line;
		while (getline(file, line)) {
			string token;
			stringstream ss(line);
			while (getline(ss, token, ' ')) {
				if (!token.empty()) values.push_back(stoi(token));
			}
		}
		file.clear(); // po�itsimo EOF(drugace tellg ne dela)
		file.seekg(0, ios::end);
		origSize= file.tellg();

		file.close();
	}
	void generateSequence(int N, int M) {

		random_device rd;
		mt19937 gen(rd());
		uniform_int_distribution<> dist_start(0, 255);
		uniform_int_distribution<> dist_diff(-M, M);

		int current = dist_start(gen);
		values.push_back(current);

		for (int i = 1; i < N; i++) {
			int diff = dist_diff(gen);
			int newVal = current + diff;

			if (newVal < 0) newVal = 0;
			else if (newVal > 255) newVal = 255;

			current = newVal;
			values.push_back(current);
		}
		origSize = N;
	}

	void writeFile() {
		string output = "output.bin";
		ofstream file(output, ios::binary);
		if (!file.is_open()) return;

		unsigned char byte = 0;
		int bitCount = 0;
		int byteCount=0; //za size

		for (char bit : result) {
			byte = (byte << 1) | (bit - '0');
			bitCount++;
			if (bitCount == 8) {
				file.put(byte);
				bitCount = 0;
				byte = 0;
				byteCount++;
			}
		}

		if (bitCount > 0) {
			while (bitCount < 8) {
				byte = (byte << 1) | 0;
				bitCount++;
			}
			file.put(byte);
			byteCount++;
		}
		newSize = byteCount;
		file.close();
	}

	string writebytes(int bit_length, int number) {
		string data;
		for (int i = bit_length - 1; i >= 0; i--) {
			data += to_string((number >> i) & 1);
		}
		return data;
	}


	string diff_rule(int num) {
		string result = "00";
		int bit_length = 0;
		int off = 0;
		if (num >= -2 && num <= 2) {
			result += "00";
			off = 2;
			bit_length = 2;
		}
		else if (num >= -6 && num <= 6) {
			result += "01";
			off = 6;
			bit_length = 3;
		}
		else if (num >= -14 && num <= 14) {
			off = 14;
			result += "10";
			bit_length = 4;
		}
		else {
			off = 30;
			result += "11";
			bit_length = 5;
		}


		int index = (num < 0) ? (num + off) : (num + 1);

		result += writebytes(bit_length, index);
		//cout << "orig num: " << num << ", rule num: " << index << ", result: " << result << "length: " << bit_length << endl;

		return result;
	}


	string repetition_rule(int count) {
		string data;
		while (count > 0) {
			int chunk = min(8, count);
			data += "01";
			data += writebytes(3, chunk - 1); // -1 ker 000 predstavlja 1 ponovitev
			count -= chunk;
		}
		return data;
	}



	string absolute_rule(int number) {
		string data = number > 0 ? "100" : "101";
		data += writebytes(8, abs(number));
		return data;
	}


	void compression() {
		result.clear();
		vector<int>diff(values.size());

		//izra�unamo razlike
		diff[0] = values[0];
		for (int i = 0; i < values.size() - 1; i++) {
			diff[i + 1] = values[i + 1] - values[i];
		}

		//kodiramo

		//prvo stevilo
		for (int i = 7; i >= 0; i--) {
			result += to_string(((diff[0] >> i)) & 1);
		}

		//cout << "diff vector";
		//print_vector(diff);

		for (int i = 1; i < diff.size(); i++) {
			int num = diff[i];
			if (num >= -30 && num <= 30 && num!=0) result += diff_rule(num);
			else if (num == 0) {
				int count = 0;
				while (i < diff.size() && diff[i] == 0) {
					count++;
					i++;
				}
				i--;
				result += repetition_rule(count);
			}
			else result += absolute_rule(diff[i]);

		}

		result += "11";
		//cout << result;
	}
};


class Seq_decompresion {
private:
	string values;
	string filename;
	vector<int> result;
	int bitPos = 0;
public:

	Seq_decompresion(string file) : filename(file) {}
	void readFile() {
		ifstream file(filename, ios::binary);
		if (!file.is_open()) return;

		file.seekg(0, ios::end);
		size_t size = file.tellg();
		string tmp(size, '\0'); //napolnimo z null
		file.seekg(0, ios::beg);

		file.read((char*)tmp.data(), size);
		values = tmp;
		//for (char c : tmp) {
		//    for (int i = 7; i >= 0; i--) {
		//        values += ((c >> i) & 1) + '0';
		//    }
		//}
		//cout<< values;
		//cout << "\n" << values.size();
	}

	void writeFile() {
		ofstream file("output.txt", ios::binary);
		if (!file.is_open()) return;


		for (size_t i = 0; i < result.size(); ++i) {
			file << result[i];
			if (i != result.size() - 1)
				file << ", ";
		}

		file.close();
	}

	//number of bits we want to convert to number, we do it from values 
	int toNumber(int bitsToRead) {
		int res = 0;
		for (int i = 0; i < bitsToRead; i++) {
			int whichByte = bitPos / 8;
			int whichBit = 7 - bitPos % 8; //za bitPos=0    

			int bit = ((unsigned char)values[whichByte] >> whichBit) & 1; // 0<-0110010

			res |= (bit << (bitsToRead - i - 1));

			bitPos++;
		}
		return res;
	}

	void ruleOfDif() {
		int res;
		int interval;
		int value;
		int firstPos;//prvo pozitino �tevilo v intervalu
		switch (toNumber(2))
		{
		case 0:firstPos = 1; interval = 2; break;
		case 1:firstPos = 3; interval = 3; break;
		case 2:firstPos = 7; interval = 4; break;
		case 3:firstPos = 15; interval = 5; break;
		}
		value = toNumber(interval);
		res = (value <= firstPos) ? firstPos*-2+value : value - 1;
		result.push_back(res);
	}

	void ruleOfRep() {

		int reps = toNumber(3) +1; // ker 000 predstavlja 1
		for (int i = 0; i < reps; i++) {
			result.push_back(0);
		}
	}

	void ruleOfAbs() {
		bool signBit = toNumber(1);
		int valueBits = toNumber(8);
		if (signBit) valueBits *= -1;
		result.push_back(valueBits);
	}




	void decompresion() {
		result.push_back(toNumber(8)); //prva stevilka
		bool running = true;
		while (running) {
			int next = toNumber(2);
			//cout << "next" << next;
			switch (next) {
			case 0: ruleOfDif(); break;
			case 1: ruleOfRep(); break;
			case 2: ruleOfAbs(); break;
			case 3:
				running = false;
				break;
			}
		}
		vector <int> tmp = result;
		for (int i = 1; i < tmp.size(); i++) {
			result[i] = result[i-1] + tmp[i];
		}

		print_vector(result);
	}
};



int main()
{


	string filename = "test.txt";
	Seq_compresion compresion (filename);
	compresion.readFile();
	//compresion.generateSequence(500, 5);

	compresion.compression();
	compresion.writeFile();
	compresion.printSizes();

	Seq_decompresion decompresion("output.bin");
	decompresion.readFile();
	decompresion.decompresion();
	decompresion.writeFile();
	return 0;
}