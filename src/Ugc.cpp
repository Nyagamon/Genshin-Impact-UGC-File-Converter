#include "Ugc.h"
#include "Reader.h"
#include "Writer.h"

static inline constexpr uint32_t bswap32(uint32_t v)noexcept{return (v << 24) | ((v & 0xFF00) << 8) | ((v & 0xFF0000) >> 8) | (v >> 24);}

bool Ugc::load_file(const char *path)noexcept{

	std::vector<uint8_t> buf;
	FILE *fp = nullptr;
	if(fopen_s(&fp, path, "rb") || fp == nullptr){
		return false;
	}

	fseek(fp, 0, SEEK_END);
	auto size = ftell(fp);
	if(size > 0){
		try{
			buf.resize(static_cast<size_t>(size));
		}catch(...){
			fclose(fp);
			return false;
		}
		fseek(fp, 0, SEEK_SET);
		if(fread(&buf[0], 1, static_cast<size_t>(size), fp) != static_cast<size_t>(size)){
			fclose(fp);
			return false;
		}
	}

	fclose(fp);

	if(buf.size() < 0x14){
		return false;
	}
	auto data = reinterpret_cast<uint32_t *>(&buf[0]);
	auto data1_size = bswap32(data[0]);
	auto r1 = bswap32(data[1]);
	auto r2 = bswap32(data[2]);
	auto r3 = bswap32(data[3]);
	auto data2_size = bswap32(data[4]);
	auto data2 = &buf[0x14];
	if(buf.size() < data1_size + 4 || buf.size() < data2_size + 0x14){
		return false;
	}
	auto r4 = bswap32(*reinterpret_cast<uint32_t *>(&buf[data1_size]));

	auto &root = _data.root();
	root.type = UgcData::Node::Type::object_t;
	auto n1 = _data.push_back_int(root, 1, "", r1, 0, 0);
	auto n2 = _data.push_back_int(root, 2, "", r2, 0, 0);
	auto n3 = _data.push_back_int(root, 3, "", r3, 0, 0);
	auto n4 = _data.push_back_object(root, 4, "", 0, 0);
  auto n5 = _data.push_back_int(root, 5, "", r4, 0, 0);
	auto dtype = _dtype.search_id(_dtype.root(), r3);
	auto r = Reader(data2, data2_size);
	auto read = [this](auto self, UgcData::Node &parent, Dtype::Node &parent_dtype, Reader &r)noexcept -> bool {
		while(!r.is_eof_error()){

			auto offset = r.offset();
			auto offset2 = r.offset();
			auto id = r.read_uint();
			auto type = static_cast<CodeType>(id & 7);
			id >>= 3;

			uint32_t value_int = 0;
			const uint8_t *value_data = nullptr;
			size_t value_data_size = 0;
			float value_float = 0;
			switch(type){
			case CodeType::int_t:
				value_int = r.read_uint();
				break;
			case CodeType::data_t:
				value_data_size = r.read_uint();
				offset2 = r.offset();
				value_data = r.read_data(value_data_size);
				break;
			case CodeType::float_t:
				value_float = r.read_float();
				break;
			default:
				_log.add_type_unknown(parent_dtype.line, id, static_cast<uint8_t>(type));
				return true;
			}
			if(r.is_error()){
				break;
			}

			auto dtype = _dtype.search_id(parent_dtype, id);
			if(!dtype){
				try{
					switch(type){
					case CodeType::int_t:
						dtype = _dtype.push_back_int(parent_dtype, id);
						_log.add_insert_int(parent_dtype.line, id, value_int);
						break;
					case CodeType::data_t:
						dtype = _dtype.push_back_unknown(parent_dtype, id);
						_log.add_insert_unknown(parent_dtype.line, id, value_data, value_data_size);
						break;
					case CodeType::float_t:
						dtype = _dtype.push_back_float(parent_dtype, id);
						_log.add_insert_float(parent_dtype.line, id, value_float);
						break;
					}
				}catch(...){
					return false;
				}
				if(!dtype){
					return false;
				}
			}
			auto dtype_ex = _dtype.ex(*dtype);
			if(!dtype_ex){
				return false;
			}

      auto *p = &parent;
			auto node = _data.search_id(parent, id);
			if(node && dtype_ex->is_array){
				p = node;
			}else if(node){
				dtype_ex->is_array = true;
				p = _data.push_back_array(*node, id, dtype_ex->name, offset, dtype->line);
				if(!p){
					return false;
				}
				try{
					std::swap(*p, *node);
				}catch(...){
					return false;
				}
				_log.add_is_array(dtype->line, id);
			}else if(dtype_ex->is_array){
				p = _data.push_back_array(parent, id, dtype_ex->name, offset, dtype->line);
				if(!p){
					return false;
				}
			}

			switch(dtype_ex->type){
			case Dtype::Ex::Type::unknown_t:
				node = _data.push_back_data(*p, id, dtype_ex->name, value_data, value_data_size, offset, dtype->line);
				if(!node){
					return false;
				}
				if(value_data_size){
					_log.add_unknown(dtype->line, id, _data.ex(*node)->data);
				}
				break;
			case Dtype::Ex::Type::int_t:
				if(!_data.push_back_int(*p, id, dtype_ex->name, value_int, offset, dtype->line)){
					return false;
				}
				break;
			case Dtype::Ex::Type::float_t:
				if(!_data.push_back_float(*p, id, dtype_ex->name, value_float, offset, dtype->line)){
					return false;
				}
				break;
			case Dtype::Ex::Type::string_t:
				if(!_data.push_back_string(*p, id, dtype_ex->name, reinterpret_cast<const char *>(value_data), value_data_size, offset, dtype->line)){
					return false;
				}
				break;
			case Dtype::Ex::Type::data_t:
				if(!_data.push_back_data(*p, id, dtype_ex->name, value_data, value_data_size, offset, dtype->line)){
					return false;
				}
				break;
			case Dtype::Ex::Type::object_t:
				{
					auto child = _data.push_back_object(*p, id, dtype_ex->name, offset, dtype->line);
					Reader child_r(value_data, value_data_size, offset2);
					if(!child || !self(self, *child, *dtype, child_r)){
						return false;
					}
				}
				break;
			}

		}
		if(r.is_error()){
			fprintf(stderr, "Error: データサイズを超えてアクセスしようとしました。型が間違っている可能性があります。dtypeファイル%d行目\n", parent_dtype.line);
			return false;
		}

		return true;
	};

	return n1 && n2 && n3 && n4 && n5 && dtype && read(read, *n4, *dtype, r);
}

bool Ugc::save_file(const char *path)noexcept{

	FILE *fp = nullptr;
	if(fopen_s(&fp, path, "wb") || fp == nullptr){
		return false;
	}

	auto write_key = [](Writer &w, uint32_t id, CodeType type)noexcept -> bool {
		return w.write_int((id << 3) | static_cast<uint32_t>(type));
	};
	auto write = [this, write_key](auto self, Writer &w, UgcData::Node &parent_node, Dtype::Node *parent_dtype, bool is_array=false)noexcept -> bool {
		for(auto &node : parent_node.children){
			auto ex = _data.ex(node);
			if(!ex){
				return false;
			}
			Dtype::Node *dtype = nullptr;
			if(parent_dtype){
				if(ex->id){
					dtype = _dtype.search_id(*parent_dtype, ex->id);
				}
				if(!dtype){
					dtype = _dtype.search_name(*parent_dtype, ex->name);
				}
			}
			if(dtype && dtype->ex){
				auto dtype_ex = _dtype.ex(*dtype);
				auto id = dtype_ex->id;
				if(!is_array && dtype_ex->is_array){
					//for(auto &child : node.children){
					self(self, w, node, parent_dtype, true);
					//}
					/*
					Writer value_w;
					bool skip = false;
					switch(dtype_ex->type){
					case Dtype::Ex::Type::int_t:
						for(auto &child : node.children){
							value_w.write_int(child.value_int);
						}
						break;
					case Dtype::Ex::Type::float_t:
						for(auto &child : node.children){
							value_w.write_float(static_cast<float>(child.value_float));
						}
						break;
					case Dtype::Ex::Type::string_t:
						for(auto &child : node.children){
							value_w.write_string(child.value_string);
						}
						break;
					case Dtype::Ex::Type::data_t:
					case Dtype::Ex::Type::unknown_t:
						for(auto &child : node.children){
							auto ex = _data.ex(child);
							if(!ex){
								return false;
							}
							value_w.write_data(ex->data);
						}
						break;
					case Dtype::Ex::Type::object_t:
						self(self, w, node, parent_dtype, true);
						skip = true;
						break;
					}
					if(!skip){
						write_key(w, id, CodeType::data_t);
						w.write_data(value_w.buf());
					}*/
				}else{
					switch(dtype_ex->type){
					case Dtype::Ex::Type::int_t:
						write_key(w, id, CodeType::int_t);
						w.write_int(node.value_int);
						break;
					case Dtype::Ex::Type::float_t:
						write_key(w, id, CodeType::float_t);
						w.write_float(static_cast<float>(node.value_float));
						break;
					case Dtype::Ex::Type::string_t:
						write_key(w, id, CodeType::data_t);
						w.write_string(node.value_string);
						break;
					case Dtype::Ex::Type::data_t:
					case Dtype::Ex::Type::unknown_t:
						write_key(w, id, CodeType::data_t);
						w.write_data(ex->data);
						break;
					case Dtype::Ex::Type::object_t:
						{
							Writer value_w;
							self(self, value_w, node, dtype);
							write_key(w, id, CodeType::data_t);
							w.write_data(value_w.buf());
						}
						break;
					}
				}
			}else{
				auto id = ex->id;
				switch(ex->type){
				case UgcData::Ex::Type::int_t:
					write_key(w, id, CodeType::int_t);
					w.write_int(node.value_int);
					break;
				case UgcData::Ex::Type::float_t:
					write_key(w, id, CodeType::float_t);
					w.write_float(static_cast<float>(node.value_float));
					break;
				case UgcData::Ex::Type::string_t:
					write_key(w, id, CodeType::data_t);
					w.write_string(node.value_string);
					break;
				case UgcData::Ex::Type::data_t:
				case UgcData::Ex::Type::unknown_t:
					write_key(w, id, CodeType::data_t);
					w.write_data(ex->data);
					break;
				case UgcData::Ex::Type::array_t:
					//@@@@@@@@@@@
					break;
				case UgcData::Ex::Type::object_t:
					{
						Writer value_w;
						self(self, value_w, node, nullptr);
						write_key(w, id, CodeType::data_t);
						w.write_data(value_w.buf());
					}
					break;
				}
			}
		}
		return true;
	};

	auto n1 = _data.search_id(_data.root(), 1);
	auto n2 = _data.search_id(_data.root(), 2);
	auto n3 = _data.search_id(_data.root(), 3);
	auto n4 = _data.search_id(_data.root(), 4);
	auto n5 = _data.search_id(_data.root(), 5);
	if(!n1 || !n2 || !n3 || !n4 || !n5){
		fclose(fp);
		return false;
	}
	auto r1 = n1->value_int;
	auto r2 = n2->value_int;
	auto r3 = n3->value_int;
	auto r5 = n5->value_int;
	Writer w;
	auto dtype = _dtype.search_id(_dtype.root(), r3);
	if(!dtype || !write(write, w, *n4, dtype)){
		fclose(fp);
		return false;
	}

	auto &data = w.buf();
	auto size = bswap32(static_cast<uint32_t>(data.size()) + 0x14);
	r1 = bswap32(r1);
	r2 = bswap32(r2);
	r3 = bswap32(r3);
	r5 = bswap32(r5);
	fwrite(&size, sizeof(size), 1, fp);
	fwrite(&r1, sizeof(r1), 1, fp);
	fwrite(&r2, sizeof(r2), 1, fp);
	fwrite(&r3, sizeof(r3), 1, fp);
	size = bswap32(static_cast<uint32_t>(data.size()));
	fwrite(&size, sizeof(size), 1, fp);
	if(!data.empty()){
		fwrite(&data[0], 1, data.size(), fp);
	}
	fwrite(&r5, sizeof(r5), 1, fp);

	fclose(fp);

	return true;
}

bool Ugc::is_gil(void)noexcept{
	auto n = _data.search_id(_data.root(), 3);
	return n && n->value_int == 2;
}
