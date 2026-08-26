package com.snsapp.backend.mapper;

import com.snsapp.backend.domain.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserMapper {

    Optional<User> findById(@Param("id") Long id);

    Optional<User> findByEmail(@Param("email") String email);

    Optional<User> findByUsername(@Param("username") String username);

    void insert(User user);
}
